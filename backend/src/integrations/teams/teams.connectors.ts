import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TeamsConnector,
  TeamsInboundMessage,
  TeamsNotification,
} from './teams-connector.interface';

type TeamsIntegrationConfig = {
  type?: 'mock' | 'graph';
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  teamId?: string;
  channelId?: string;
  webhookSecret?: string;
};

@Injectable()
export class MockTeamsConnector implements TeamsConnector {
  private readonly logger = new Logger(MockTeamsConnector.name);
  private notifications: TeamsNotification[] = [];

  async sendNotification(notification: TeamsNotification) {
    this.notifications.push(notification);
    this.logger.log(`[Mock Teams] ${notification.title}: ${notification.body}`);
    return { success: true, externalId: `mock-${Date.now()}` };
  }

  async parseInbound(payload: unknown): Promise<TeamsInboundMessage | null> {
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

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getConfig(): Promise<TeamsIntegrationConfig> {
    const setting = await this.prisma.integrationSetting.findUnique({
      where: { connector: 'teams' },
    });
    return (setting?.config as TeamsIntegrationConfig) || {};
  }

  private async getClient(cfg: TeamsIntegrationConfig) {
    if (!cfg.tenantId || !cfg.clientId || !cfg.clientSecret) {
      throw new Error('Teams Graph config missing tenantId/clientId/clientSecret');
    }

    const credential = new ClientSecretCredential(cfg.tenantId, cfg.clientId, cfg.clientSecret);
    return Client.init({
      authProvider: async (done) => {
        try {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          done(null, token?.token || '');
        } catch (err) {
          done(err as Error, '');
        }
      },
    });
  }

  async sendNotification(notification: TeamsNotification) {
    const cfg = await this.getConfig();
    if (cfg.type !== 'graph') return { success: false };
    if (!cfg.teamId) throw new Error('Teams Graph config missing teamId');
    const channelId = notification.channelId || cfg.channelId;
    if (!channelId) throw new Error('Teams Graph config missing channelId');

    const client = await this.getClient(cfg);

    const body = {
      body: {
        contentType: 'html',
        content: `<b>${escapeHtml(notification.title)}</b><br/>${escapeHtml(notification.body).replace(/\n/g, '<br/>')}`,
      },
    };

    const res = (await client
      .api(`/teams/${cfg.teamId}/channels/${channelId}/messages`)
      .post(body)) as { id?: string };

    return { success: true, externalId: res?.id };
  }

  async parseInbound(payload: unknown): Promise<TeamsInboundMessage | null> {
    const cfg = await this.getConfig();
    if (cfg.type !== 'graph') return null;

    const p = payload as { value?: Array<Record<string, unknown>> };
    const first = p?.value?.[0];
    if (!first) return null;

    const resource = String(first.resource || '');
    const messageId = String((first.resourceData as any)?.id || '');
    if (!messageId) return null;

    const parsed = parseTeamsResource(resource);
    if (!parsed?.teamId || !parsed?.channelId) return null;

    const client = await this.getClient(cfg);
    const message = (await client
      .api(`/teams/${parsed.teamId}/channels/${parsed.channelId}/messages/${messageId}`)
      .get()) as any;

    const content = String(message?.body?.content || '').replace(/<[^>]+>/g, '').trim();
    const fromUserId = message?.from?.user?.id ? String(message.from.user.id) : undefined;
    const fromUserName = message?.from?.user?.displayName ? String(message.from.user.displayName) : undefined;

    if (!content) return null;

    return {
      externalId: messageId,
      channelId: parsed.channelId,
      fromUserId,
      fromUserName,
      body: content,
    };
  }
}

@Injectable()
export class TeamsDispatchService {
  private connector: TeamsConnector;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mockConnector: MockTeamsConnector,
    private readonly graphConnector: GraphTeamsConnector,
  ) {
    this.connector = mockConnector;
  }

  private async resolveConnector(): Promise<TeamsConnector> {
    const envType = (this.config.get('TEAMS_CONNECTOR') || 'mock') as 'mock' | 'graph';
    const setting = await this.prisma.integrationSetting.findUnique({ where: { connector: 'teams' } });
    const cfg = (setting?.config as TeamsIntegrationConfig) || {};
    const type = (cfg.type || envType) as 'mock' | 'graph';
    const isActive = setting?.isActive ?? true;
    if (!isActive) return this.mockConnector;
    return type === 'graph' ? this.graphConnector : this.mockConnector;
  }

  async handleWebhook(payload: unknown) {
    this.connector = await this.resolveConnector();
    const message = await this.connector.parseInbound(payload);
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
    this.connector = await this.resolveConnector();
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

function parseTeamsResource(resource: string): { teamId?: string; channelId?: string } | null {
  // Expected resource format (example):
  // teams('TEAM_ID')/channels('CHANNEL_ID')/messages('MESSAGE_ID')
  const match = resource.match(/teams\('([^']+)'\)\/channels\('([^']+)'\)/i);
  if (!match) return null;
  return { teamId: match[1], channelId: match[2] };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
