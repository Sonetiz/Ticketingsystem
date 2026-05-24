import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TeamsConnector,
  TeamsInboundMessage,
  TeamsNotification,
} from './teams-connector.interface';

@Injectable()
export class MockTeamsConnector implements TeamsConnector {
  private readonly logger = new Logger(MockTeamsConnector.name);
  private notifications: TeamsNotification[] = [];

  async sendNotification(notification: TeamsNotification) {
    this.notifications.push(notification);
    this.logger.log(`[Mock Teams] ${notification.title}: ${notification.body}`);
    return { success: true, externalId: `mock-${Date.now()}` };
  }

  parseInbound(payload: unknown): TeamsInboundMessage | null {
    const p = payload as Record<string, unknown>;
    if (!p?.body) return null;
    return {
      externalId: (p.externalId as string) || `mock-${Date.now()}`,
      channelId: p.channelId as string,
      fromUserId: p.fromUserId as string,
      fromUserName: p.fromUserName as string,
      body: p.body as string,
    };
  }

  getSentNotifications() {
    return this.notifications;
  }
}

@Injectable()
export class GraphTeamsConnector implements TeamsConnector {
  private readonly logger = new Logger(GraphTeamsConnector.name);

  async sendNotification(_notification: TeamsNotification) {
    this.logger.warn('Microsoft Graph Teams connector is a skeleton - not implemented');
    return { success: false };
  }

  parseInbound(_payload: unknown): TeamsInboundMessage | null {
    this.logger.warn('Microsoft Graph Teams parse is a skeleton - not implemented');
    return null;
  }
}

@Injectable()
export class TeamsDispatchService {
  private connector: TeamsConnector;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mockConnector: MockTeamsConnector,
    private readonly graphConnector: GraphTeamsConnector,
  ) {
    this.connector = mockConnector;
  }

  setConnector(type: 'mock' | 'graph') {
    this.connector = type === 'graph' ? this.graphConnector : this.mockConnector;
  }

  async handleWebhook(payload: unknown) {
    const message = this.connector.parseInbound(payload);
    if (!message) return null;

    const existing = await this.prisma.teamsMessage.findUnique({
      where: { externalId: message.externalId },
    });
    if (existing) return existing;

    const defaultTeam = await this.prisma.team.findFirst({ where: { isDefault: true } });
    const ticket = await this.prisma.ticket.create({
      data: {
        title: message.body.slice(0, 100),
        description: message.body,
        assignedTeamId: defaultTeam?.id,
        source: 'teams',
        status: 'new',
      },
    });

    return this.prisma.teamsMessage.create({
      data: {
        ticketId: ticket.id,
        externalId: message.externalId,
        channelId: message.channelId,
        fromUserId: message.fromUserId,
        body: message.body,
        direction: 'inbound',
      },
    });
  }

  async notify(notification: TeamsNotification) {
    const result = await this.connector.sendNotification(notification);
    if (notification.ticketId) {
      await this.prisma.teamsMessage.create({
        data: {
          ticketId: notification.ticketId,
          externalId: result.externalId || `out-${Date.now()}`,
          body: `${notification.title}\n${notification.body}`,
          direction: 'outbound',
        },
      });
    }
    return result;
  }
}
