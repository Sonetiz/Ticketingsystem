import { Inject, Injectable, NotFoundException, ForbiddenException, forwardRef } from '@nestjs/common';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../common/realtime/realtime.service';
import { sanitizeHtml } from '../common/sanitize';
import { CreateMessageDto, SendEmailDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(ticketId: string, dto: CreateMessageDto, actor: SessionUser) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const canAccess = await this.rbac.canAccessTicket(actor, ticket);
    if (!canAccess) throw new ForbiddenException();

    const isPublic = dto.kind === 'public_reply';
    const body = sanitizeHtml(dto.body);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: actor.id,
        kind: dto.kind,
        body,
        isPublic,
        mentions: dto.mentionUserIds?.length
          ? {
              create: dto.mentionUserIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        mentions: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (isPublic && ['resolved', 'closed'].includes(ticket.status)) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'open' },
      });
    }

    await this.audit.log({
      actorId: actor.id,
      entityType: 'ticket_message',
      entityId: message.id,
      action: isPublic ? 'public_reply_added' : 'internal_note_added',
      newValue: { ticketId },
    });

    this.realtime.emitTicketMessage(ticketId, message);

    const recipientIds = await this.getRecipientIds(ticketId, actor.id);
    const preview = body.replace(/<[^>]+>/g, '').slice(0, 200);
    await this.notifications.notifyNewMessage(ticketId, recipientIds, preview);

    if (dto.mentionUserIds?.length) {
      for (const userId of dto.mentionUserIds) {
        if (userId !== actor.id) {
          await this.notifications.notifyMention(userId, ticketId, preview);
        }
      }
    }

    return message;
  }

  private async getRecipientIds(ticketId: string, excludeUserId?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { watchers: true },
    });
    if (!ticket) return [];
    const ids = new Set<string>();
    if (ticket.assigneeId) ids.add(ticket.assigneeId);
    if (ticket.requesterId) ids.add(ticket.requesterId);
    ticket.watchers.forEach((w) => ids.add(w.userId));
    if (excludeUserId) ids.delete(excludeUserId);
    return Array.from(ids);
  }

  async getTimeline(ticketId: string, actor: SessionUser, publicOnly = false) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException();
    if (!publicOnly) {
      const canAccess = await this.rbac.canAccessTicket(actor, ticket);
      if (!canAccess) throw new ForbiddenException();
    }

    const messages = await this.prisma.ticketMessage.findMany({
      where: {
        ticketId,
        ...(publicOnly ? { isPublic: true } : {}),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const auditEvents = publicOnly
      ? []
      : await this.prisma.auditLog.findMany({
          where: { entityType: 'ticket', entityId: ticketId },
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        });

    return { messages, auditEvents };
  }

  async handleInboundReply(params: {
    ticketId: string;
    body: string;
    fromEmail: string;
    messageId: string;
    source: string;
  }) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: params.ticketId } });
    if (!ticket) return null;

    const body = sanitizeHtml(params.body);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: params.ticketId,
        kind: 'public_reply',
        body,
        isPublic: true,
        source: params.source,
      },
    });

    const updateData: { status?: string; holdUntil?: null; holdReason?: null; holdNote?: null } = {};
    if (['resolved', 'closed', 'on_hold', 'waiting_for_user'].includes(ticket.status)) {
      updateData.status = 'open';
    }
    if (ticket.holdUntil && ticket.holdUntil > new Date()) {
      updateData.holdUntil = null;
      updateData.holdReason = null;
      updateData.holdNote = null;
      await this.prisma.ticketMessage.create({
        data: {
          ticketId: params.ticketId,
          kind: 'system',
          body: 'Hold automatically released due to user reply',
          isPublic: false,
          source: params.source,
        },
      });
    }

    if (Object.keys(updateData).length) {
      await this.prisma.ticket.update({ where: { id: params.ticketId }, data: updateData });
    }

    await this.audit.log({
      entityType: 'ticket',
      entityId: params.ticketId,
      action: 'user_reply_received',
      newValue: { messageId: params.messageId, from: params.fromEmail },
      source: params.source,
    });

    this.realtime.emitTicketMessage(params.ticketId, message);

    return message;
  }

  async logOutboundEmail(ticketId: string, dto: SendEmailDto, actor: SessionUser) {
    const body = sanitizeHtml(dto.body);
    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: actor.id,
        kind: 'outbound_email',
        body: `Email sent to ${dto.to.join(', ')}\nSubject: ${dto.subject}\n\n${body}`,
        isPublic: dto.isPublic ?? true,
      },
    });

    await this.prisma.emailMessage.create({
      data: {
        ticketId,
        messageId: `outbound-${message.id}`,
        fromAddress: process.env.SMTP_FROM || 'support@ticketsystem.local',
        toAddresses: dto.to,
        ccAddresses: dto.cc ?? [],
        subject: dto.subject,
        bodyText: body,
        direction: 'outbound',
      },
    });

    await this.audit.log({
      actorId: actor.id,
      entityType: 'ticket',
      entityId: ticketId,
      action: 'email_sent',
      newValue: { to: dto.to, subject: dto.subject },
    });

    this.realtime.emitTicketMessage(ticketId, message);

    return message;
  }
}
