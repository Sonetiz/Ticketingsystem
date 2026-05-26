export interface TeamsInboundMessage {
  externalId: string;
  channelId?: string;
  fromUserId?: string;
  fromUserName?: string;
  body: string;
}

export interface TeamsNotification {
  channelId?: string;
  userId?: string;
  title: string;
  body: string;
  ticketId?: string;
}

export interface TeamsConnector {
  sendNotification(notification: TeamsNotification): Promise<{ success: boolean; externalId?: string }>;
  parseInbound(payload: unknown): Promise<TeamsInboundMessage | null>;
}

export const TEAMS_CONNECTOR = Symbol('TEAMS_CONNECTOR');
