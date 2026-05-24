import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailDispatchService } from '../integrations/email/email-dispatch.service';
import { TeamsDispatchService } from '../integrations/teams/teams.connectors';
import { renderTemplate } from './template-renderer';
import { RealtimeService } from '../common/realtime/realtime.service';
import { notificationsSentCounter } from '../metrics/metrics.controller';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  channels?: ('email' | 'teams' | 'in_app')[];
  ticketId?: string;
  email?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailDispatch: EmailDispatchService,
    private readonly teamsDispatch: TeamsDispatchService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  private async renderFromTemplate(slug: string, vars: Record<string, string | number | undefined>, fallback: { title: string; body: string }) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { slug } });
    if (!template) return fallback;
    return {
      title: renderTemplate(template.subject || fallback.title, vars),
      body: renderTemplate(template.body, vars),
    };
  }

  async notify(payload: NotificationPayload) {
    const channels = payload.channels ?? ['in_app'];
    const results = [];

    for (const channel of channels) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          channel,
          title: payload.title,
          body: payload.body,
          payload: payload.ticketId ? { ticketId: payload.ticketId } : undefined,
          status: 'pending',
        },
      });

      try {
        if (channel === 'in_app') {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'delivered', sentAt: new Date() },
          });
          this.realtime?.emitNotification(payload.userId, notification);
        } else if (channel === 'email' && payload.email) {
          await this.emailDispatch.sendOutbound(
            { to: [payload.email], subject: payload.title, bodyText: payload.body },
            payload.ticketId,
          );
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'sent', sentAt: new Date() },
          });
        } else if (channel === 'teams') {
          await this.teamsDispatch.notify({
            title: payload.title,
            body: payload.body,
            ticketId: payload.ticketId,
          });
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'sent', sentAt: new Date() },
          });
        }
        notificationsSentCounter.inc({ channel });
        results.push({ channel, success: true });
      } catch (err) {
        this.logger.error(`Failed to deliver ${channel} notification`, err);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'failed' },
        });
        results.push({ channel, success: false });
      }
    }

    return results;
  }

  async notifyTicketAssigned(ticketId: string, assigneeId: string, actorName?: string) {
    const [ticket, user] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId } }),
      this.prisma.user.findUnique({ where: { id: assigneeId } }),
    ]);
    if (!ticket || !user) return;
    const rendered = await this.renderFromTemplate('ticket_assigned', {
      number: ticket.number,
      title: ticket.title,
      actor: actorName,
    }, {
      title: `Ticket #${ticket.number} assigned to you`,
      body: ticket.title,
    });
    return this.notify({
      userId: user.id,
      email: user.email,
      title: rendered.title,
      body: rendered.body,
      ticketId,
      channels: ['in_app', 'email'],
    });
  }

  async notifyStatusChanged(ticketId: string, status: string, recipientIds: string[]) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;
    const rendered = await this.renderFromTemplate('ticket_status_changed', {
      number: ticket.number,
      title: ticket.title,
      status,
    }, {
      title: `Ticket #${ticket.number} status changed`,
      body: `Status is now ${status}`,
    });
    const users = await this.prisma.user.findMany({ where: { id: { in: recipientIds } } });
    for (const user of users) {
      await this.notify({
        userId: user.id,
        email: user.email,
        title: rendered.title,
        body: rendered.body,
        ticketId,
        channels: ['in_app', 'email'],
      });
    }
  }

  async notifyNewMessage(ticketId: string, recipientIds: string[], preview: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;
    const rendered = await this.renderFromTemplate('ticket_new_message', {
      number: ticket.number,
      title: ticket.title,
      preview,
    }, {
      title: `New message on #${ticket.number}`,
      body: preview,
    });
    const users = await this.prisma.user.findMany({ where: { id: { in: recipientIds } } });
    for (const user of users) {
      await this.notify({
        userId: user.id,
        email: user.email,
        title: rendered.title,
        body: rendered.body,
        ticketId,
        channels: ['in_app'],
      });
    }
  }

  async notifyMention(userId: string, ticketId: string, preview: string) {
    const [ticket, user] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!ticket || !user) return;
    const rendered = await this.renderFromTemplate('ticket_mention', {
      number: ticket.number,
      title: ticket.title,
      preview,
    }, {
      title: `You were mentioned on #${ticket.number}`,
      body: preview,
    });
    return this.notify({
      userId: user.id,
      email: user.email,
      title: rendered.title,
      body: rendered.body,
      ticketId,
      channels: ['in_app', 'email'],
    });
  }

  async notifySlaBreach(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignee: true,
        watchers: true,
        assignedTeam: { include: { memberships: true } },
      },
    });
    if (!ticket) return;
    const rendered = await this.renderFromTemplate('sla_breached', {
      number: ticket.number,
      title: ticket.title,
    }, {
      title: `SLA breached on #${ticket.number}`,
      body: ticket.title,
    });
    const recipientIds = new Set<string>();
    if (ticket.assigneeId) recipientIds.add(ticket.assigneeId);
    ticket.watchers.forEach((w) => recipientIds.add(w.userId));
    ticket.assignedTeam?.memberships.forEach((m) => recipientIds.add(m.userId));
    const users = await this.prisma.user.findMany({ where: { id: { in: Array.from(recipientIds) } } });
    for (const user of users) {
      await this.notify({
        userId: user.id,
        email: user.email,
        title: rendered.title,
        body: rendered.body,
        ticketId,
        channels: ['in_app', 'email'],
      });
    }
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        channel: 'in_app',
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, channel: 'in_app', readAt: null },
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date(), status: 'read' },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, channel: 'in_app', readAt: null },
      data: { readAt: new Date(), status: 'read' },
    });
  }

  /** @deprecated use notifyTicketAssigned */
  async notifyTicketAssignee(ticketId: string, assigneeId: string) {
    return this.notifyTicketAssigned(ticketId, assigneeId);
  }
}
