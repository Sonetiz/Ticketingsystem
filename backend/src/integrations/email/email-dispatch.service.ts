import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../../tickets/tickets.service';
import { MessagesService } from '../../messages/messages.service';
import { AuditService } from '../../audit/audit.service';
import {
  EmailConnector,
  InboundEmail,
  OutboundEmail,
} from './email-connector.interface';
import {
  MockEmailConnector,
  ImapEmailConnector,
  GraphEmailConnector,
} from './email.connectors';

@Injectable()
export class EmailDispatchService {
  private readonly logger = new Logger(EmailDispatchService.name);
  private connector: EmailConnector;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TicketsService))
    private readonly tickets: TicketsService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messages: MessagesService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly mockConnector: MockEmailConnector,
    private readonly imapConnector: ImapEmailConnector,
    private readonly graphConnector: GraphEmailConnector,
  ) {
    this.connector = this.resolveConnector();
  }

  private resolveConnector(): EmailConnector {
    const type = this.config.get('EMAIL_CONNECTOR') || 'mock';
    switch (type) {
      case 'imap':
        return this.imapConnector;
      case 'graph':
        return this.graphConnector;
      default:
        return this.mockConnector;
    }
  }

  async pollInbound() {
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const emails = await this.connector.fetchInbound(since);
    for (const email of emails) {
      await this.processInbound(email);
    }
    return { processed: emails.length };
  }

  async processInbound(email: InboundEmail) {
    const existing = await this.prisma.emailMessage.findUnique({
      where: { messageId: email.messageId },
    });
    if (existing) {
      this.logger.debug(`Skipping duplicate email ${email.messageId}`);
      return existing;
    }

    const ticketId = await this.matchTicket(email);

    if (ticketId) {
      await this.messages.handleInboundReply({
        ticketId,
        body: email.bodyText || email.bodyHtml || '',
        fromEmail: email.from,
        messageId: email.messageId,
        source: 'email',
      });
      return this.prisma.emailMessage.create({
        data: {
          ticketId,
          messageId: email.messageId,
          inReplyTo: email.inReplyTo,
          references: email.references,
          fromAddress: email.from,
          toAddresses: email.to,
          ccAddresses: email.cc,
          subject: email.subject,
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          direction: 'inbound',
          rawHeaders: email.rawHeaders,
        },
      });
    }

    const defaultTeam = await this.prisma.team.findFirst({ where: { isDefault: true } });
    const requester = await this.prisma.user.findUnique({
      where: { email: email.from.toLowerCase() },
    });

    const ticket = await this.tickets.create(
      {
        title: email.subject || 'Email ticket',
        description: email.bodyText || email.bodyHtml || '(no body)',
        requesterId: requester?.id,
        assignedTeamId: defaultTeam?.id,
      },
      null,
      'email',
    );

    await this.audit.log({
      entityType: 'ticket',
      entityId: ticket.id,
      action: 'created_from_email',
      newValue: { from: email.from, subject: email.subject },
      source: 'email',
    });

    return this.prisma.emailMessage.create({
      data: {
        ticketId: ticket.id,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        references: email.references,
        fromAddress: email.from,
        toAddresses: email.to,
        ccAddresses: email.cc,
        subject: email.subject,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        direction: 'inbound',
      },
    });
  }

  private async matchTicket(email: InboundEmail): Promise<string | null> {
    if (email.inReplyTo) {
      const byReply = await this.prisma.emailMessage.findFirst({
        where: { messageId: email.inReplyTo },
      });
      if (byReply?.ticketId) return byReply.ticketId;
    }

    for (const ref of email.references) {
      const byRef = await this.prisma.emailMessage.findFirst({
        where: { messageId: ref },
      });
      if (byRef?.ticketId) return byRef.ticketId;
    }

    const ticketMatch = email.subject.match(/\[#TICKET-(\d+)\]/i);
    if (ticketMatch) {
      const ticket = await this.prisma.ticket.findFirst({
        where: { number: parseInt(ticketMatch[1], 10) },
      });
      if (ticket) return ticket.id;
    }

    return null;
  }

  async sendOutbound(msg: OutboundEmail, ticketId?: string) {
    const result = await this.connector.sendMail(msg);
    if (ticketId && result.success) {
      await this.prisma.emailMessage.create({
        data: {
          ticketId,
          messageId: result.messageId,
          fromAddress: this.config.get('SMTP_FROM') || 'support@ticketsystem.local',
          toAddresses: msg.to,
          ccAddresses: msg.cc ?? [],
          subject: msg.subject,
          bodyText: msg.bodyText,
          bodyHtml: msg.bodyHtml,
          direction: 'outbound',
        },
      });
    }
    return result;
  }
}
