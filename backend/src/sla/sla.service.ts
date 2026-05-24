import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { computeEscalationLevel, shouldReleaseHold } from './sla.engine';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async evaluateAllTickets() {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['closed', 'cancelled'] },
        dueAt: { not: null },
      },
    });

    let escalated = 0;
    for (const ticket of tickets) {
      const result = computeEscalationLevel({
        dueAt: ticket.dueAt,
        currentPriority: ticket.priority,
      });

      if (result.isOverdue && !ticket.slaBreached) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { slaBreached: true, slaBreachedAt: new Date() },
        });
        await this.prisma.slaBreachEvent.create({
          data: { ticketId: ticket.id, breachType: 'resolution' },
        });
        await this.audit.log({
          entityType: 'ticket',
          entityId: ticket.id,
          action: 'sla_breached',
          newValue: { breachedAt: new Date() },
          source: 'system_job',
        });
      }

      if (result.priority !== ticket.priority) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            priority: result.priority,
            currentEscalationLevel: result.level,
          },
        });
        await this.prisma.ticketPriorityHistory.create({
          data: {
            ticketId: ticket.id,
            fromPriority: ticket.priority,
            toPriority: result.priority,
            reason: 'sla_auto',
            source: 'system_job',
          },
        });
        await this.audit.log({
          entityType: 'ticket',
          entityId: ticket.id,
          action: 'priority_escalated',
          oldValue: { priority: ticket.priority },
          newValue: { priority: result.priority, level: result.level },
          source: 'system_job',
        });
        escalated++;
      }
    }
    this.logger.log(`SLA evaluation complete: ${escalated} tickets escalated`);
    return { evaluated: tickets.length, escalated };
  }

  async releaseExpiredHolds() {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        deletedAt: null,
        holdUntil: { lte: new Date(), not: null },
      },
    });

    let released = 0;
    for (const ticket of tickets) {
      if (!shouldReleaseHold(ticket)) continue;
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          holdUntil: null,
          holdReason: null,
          holdNote: null,
          status: ticket.status === 'on_hold' ? 'open' : ticket.status,
        },
      });
      await this.prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          kind: 'system',
          body: 'Hold automatically released (hold-until date reached)',
          isPublic: false,
          source: 'system_job',
        },
      });
      await this.audit.log({
        entityType: 'ticket',
        entityId: ticket.id,
        action: 'hold_released',
        newValue: { reason: 'hold_until_expired' },
        source: 'system_job',
      });
      released++;
    }
    this.logger.log(`Hold release complete: ${released} tickets released`);
    return { released };
  }

  calculateSlaTarget(priority: string, createdAt: Date): Date {
    const hoursMap: Record<string, number> = {
      critical: 4,
      urgent: 8,
      high: 24,
      elevated: 48,
      normal: 72,
    };
    const hours = hoursMap[priority] ?? 72;
    return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  }
}
