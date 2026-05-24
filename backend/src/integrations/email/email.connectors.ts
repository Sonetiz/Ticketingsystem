import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import {
  EmailConnector,
  InboundEmail,
  OutboundEmail,
  SendResult,
} from './email-connector.interface';

@Injectable()
export class MockEmailConnector implements EmailConnector {
  private readonly logger = new Logger(MockEmailConnector.name);
  private inbox: InboundEmail[] = [];

  constructor(private config: ConfigService) {}

  async sendMail(msg: OutboundEmail): Promise<SendResult> {
    const host = this.config.get('SMTP_HOST') || 'localhost';
    const port = parseInt(this.config.get('SMTP_PORT') || '1025', 10);
    const transporter = nodemailer.createTransport({ host, port, secure: false });
    const messageId = `<${randomUUID()}@ticketsystem.local>`;

    try {
      await transporter.sendMail({
        from: this.config.get('SMTP_FROM') || 'support@ticketsystem.local',
        to: msg.to.join(', '),
        cc: msg.cc?.join(', '),
        subject: msg.subject,
        text: msg.bodyText,
        html: msg.bodyHtml,
        inReplyTo: msg.inReplyTo,
        references: msg.references?.join(' '),
        messageId,
      });
      this.logger.log(`Email sent to ${msg.to.join(', ')}: ${msg.subject}`);
      return { messageId, success: true };
    } catch (err) {
      this.logger.error('Failed to send email', err);
      return { messageId, success: false };
    }
  }

  async fetchInbound(_since?: Date): Promise<InboundEmail[]> {
    const messages = [...this.inbox];
    this.inbox = [];
    return messages;
  }

  injectInbound(email: InboundEmail) {
    this.inbox.push(email);
  }
}

@Injectable()
export class ImapEmailConnector implements EmailConnector {
  private readonly logger = new Logger(ImapEmailConnector.name);

  constructor(private config: ConfigService) {}

  async sendMail(msg: OutboundEmail): Promise<SendResult> {
    const mock = new MockEmailConnector(this.config);
    return mock.sendMail(msg);
  }

  async fetchInbound(_since?: Date): Promise<InboundEmail[]> {
    this.logger.warn('IMAP fetch not configured - use MockEmailConnector in development');
    return [];
  }
}

@Injectable()
export class GraphEmailConnector implements EmailConnector {
  private readonly logger = new Logger(GraphEmailConnector.name);

  async sendMail(_msg: OutboundEmail): Promise<SendResult> {
    this.logger.warn('Microsoft Graph email connector is a skeleton - not implemented');
    return { messageId: randomUUID(), success: false };
  }

  async fetchInbound(_since?: Date): Promise<InboundEmail[]> {
    this.logger.warn('Microsoft Graph email fetch is a skeleton - not implemented');
    return [];
  }
}
