import { Injectable, Logger } from '@nestjs/common';
import { RRule } from 'rrule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionUser } from '@ticketsystem/shared';
import { SlaService } from '../sla/sla.service';
import { CreateRecurringTaskDto } from './dto/recurring.dto';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sla: SlaService,
  ) {}

  async create(dto: CreateRecurringTaskDto, actor: SessionUser) {
    return this.prisma.recurringTaskTemplate.create({
      data: {
        name: dto.name,
        titleTemplate: dto.titleTemplate,
        descriptionTemplate: dto.descriptionTemplate,
        rrule: dto.rrule,
        assigneeId: dto.assigneeId,
        assignedTeamId: dto.assignedTeamId,
        priority: dto.priority ?? 'normal',
        categoryId: dto.categoryId,
        dueDateOffsetHours: dto.dueDateOffsetHours ?? 24,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.recurringTaskTemplate.findMany({
      where: { deletedAt: null },
      include: { assignedTeam: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async scanAndGenerate() {
    const templates = await this.prisma.recurringTaskTemplate.findMany({
      where: { isActive: true, deletedAt: null },
    });

    let generated = 0;
    const now = new Date();

    for (const template of templates) {
      try {
        const rule = RRule.fromString(template.rrule);
        const occurrences = rule.between(
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
          now,
          true,
        );

        for (const occurrence of occurrences) {
          const runKey = occurrence.toISOString().slice(0, 10);
          const existing = await this.prisma.recurringRun.findUnique({
            where: { templateId_runKey: { templateId: template.id, runKey } },
          });
          if (existing) continue;

          const dueAt = new Date(
            occurrence.getTime() + template.dueDateOffsetHours * 60 * 60 * 1000,
          );

          const ticket = await this.prisma.ticket.create({
            data: {
              title: template.titleTemplate,
              description: template.descriptionTemplate || '',
              priority: template.priority,
              categoryId: template.categoryId,
              assignedTeamId: template.assignedTeamId,
              assigneeId: template.assigneeId,
              recurringSourceId: template.id,
              dueAt,
              slaTargetAt: dueAt,
              source: 'recurring',
              status: 'new',
            },
          });

          await this.prisma.recurringRun.create({
            data: { templateId: template.id, runKey, ticketId: ticket.id },
          });

          await this.audit.log({
            entityType: 'ticket',
            entityId: ticket.id,
            action: 'recurring_generated',
            newValue: { templateId: template.id, runKey },
            source: 'system_job',
          });

          generated++;
        }

        await this.prisma.recurringTaskTemplate.update({
          where: { id: template.id },
          data: { lastRunAt: now },
        });
      } catch (err) {
        this.logger.error(`Failed to process recurring template ${template.id}`, err);
      }
    }

    this.logger.log(`Recurring scan complete: ${generated} tickets generated`);
    return { generated };
  }

  async toggleActive(id: string, isActive: boolean) {
    return this.prisma.recurringTaskTemplate.update({
      where: { id },
      data: { isActive },
    });
  }
}
