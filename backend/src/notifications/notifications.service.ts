import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailDispatchService } from '../integrations/email/email-dispatch.service';
import { TeamsDispatchService } from '../integrations/teams/teams.connectors';

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
  ) {}

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
        } else if (channel === 'email' && payload.email) {
          await this.emailDispatch.sendOutbound(
            {
              to: [payload.email],
              subject: payload.title,
              bodyText: payload.body,
            },
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

  async notifyTicketAssignee(ticketId: string, assigneeId: string) {
    const [ticket, user] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId } }),
      this.prisma.user.findUnique({ where: { id: assigneeId } }),
    ]);
    if (!ticket || !user) return;
    return this.notify({
      userId: user.id,
      email: user.email,
      title: `Ticket #${ticket.number} assigned to you`,
      body: ticket.title,
      ticketId,
      channels: ['in_app', 'email'],
    });
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

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date(), status: 'read' },
    });
  }
}
