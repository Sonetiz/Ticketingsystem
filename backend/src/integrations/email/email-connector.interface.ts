export interface OutboundEmail {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export interface InboundEmail {
  messageId: string;
  inReplyTo?: string;
  references: string[];
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  rawHeaders?: Record<string, string>;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export interface SendResult {
  messageId: string;
  success: boolean;
}

export interface EmailConnector {
  sendMail(msg: OutboundEmail): Promise<SendResult>;
  fetchInbound(since?: Date): Promise<InboundEmail[]>;
  parse?(raw: Buffer): Promise<InboundEmail>;
}

export const EMAIL_CONNECTOR = Symbol('EMAIL_CONNECTOR');
