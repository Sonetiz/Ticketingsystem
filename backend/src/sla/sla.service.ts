import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { computeEscalationLevel, shouldReleaseHold } from './sla.engine';
import { SlaRuleResolver } from './sla-rule.resolver';
import { NotificationsService } from '../notifications/notifications.service';
import { slaBreachCounter } from '../metrics/metrics.controller';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ruleResolver: SlaRuleResolver,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications?: NotificationsService,
  ) {}

  async evaluateAllTickets() {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['closed', 'cancelled', 'on_hold'] },
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
        const breachEvent = await this.prisma.slaBreachEvent.create({
          data: { ticketId: ticket.id, breachType: 'resolution' },
        });
        slaBreachCounter.inc();
        try {
          await this.notifications?.notifySlaBreach(ticket.id);
          await this.prisma.slaBreachEvent.update({
            where: { id: breachEvent.id },
            data: { notified: true },
          });
        } catch (err) {
          this.logger.error('Failed to notify SLA breach', err);
        }
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
          data: { priority: result.priority, currentEscalationLevel: result.level },
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
        escalated++;
      }
    }
    this.logger.log(`SLA evaluation complete: ${escalated} tickets escalated`);
    return { evaluated: tickets.length, escalated };
  }

  async releaseExpiredHolds() {
    const tickets = await this.prisma.ticket.findMany({
      where: { deletedAt: null, holdUntil: { lte: new Date(), not: null } },
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
      released++;
    }
    return { released };
  }

  async calculateSlaTarget(
    priority: string,
    createdAt: Date,
    categoryId?: string | null,
    serviceId?: string | null,
  ): Promise<Date> {
    const { resolutionAt } = await this.ruleResolver.resolveTarget({
      priority,
      categoryId,
      serviceId,
      createdAt,
    });
    return resolutionAt;
  }

  async calculateSlaTargets(
    priority: string,
    createdAt: Date,
    categoryId?: string | null,
    serviceId?: string | null,
  ) {
    return this.ruleResolver.resolveTarget({ priority, categoryId, serviceId, createdAt });
  }
}
