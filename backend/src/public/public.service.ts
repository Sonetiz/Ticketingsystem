import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ROLES } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MessagesService } from '../messages/messages.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { TicketsService } from '../tickets/tickets.service';
import { EmailDispatchService } from '../integrations/email/email-dispatch.service';
import { PublicCreateTicketDto, PublicReplyDto } from './dto/public.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly messages: MessagesService,
    private readonly attachments: AttachmentsService,
    private readonly tickets: TicketsService,
    private readonly email: EmailDispatchService,
    private readonly config: ConfigService,
  ) {}

  async getTicketByMagicLink(token: string) {
    const link = await this.auth.validateMagicLink(token);
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: link.ticketId, deletedAt: null },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        messages: {
          where: { isPublic: true },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            kind: true,
            body: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
        attachments: {
          where: { isPublic: true },
          select: { id: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return {
      ...ticket,
      attachments: ticket.attachments.map((a) => ({
        ...a,
        downloadUrl: this.attachments.signDownloadUrl(a.id),
      })),
    };
  }

  async reply(token: string, dto: PublicReplyDto) {
    const link = await this.auth.validateMagicLink(token);
    return this.messages.handleInboundReply({
      ticketId: link.ticketId,
      body: dto.body,
      fromEmail: 'public-status-page',
      messageId: `public-${Date.now()}`,
      source: 'web',
    });
  }

  async createPublicTicket(dto: PublicCreateTicketDto) {
    const email = dto.requesterEmail.toLowerCase().trim();

    const role = await this.prisma.role.findUnique({ where: { slug: ROLES.REQUESTER } });
    if (!role) {
      throw new ForbiddenException('Requester role is not configured');
    }

    let requester = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });

    if (requester && !requester.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    if (!requester) {
      requester = await this.prisma.user.create({
        data: {
          email,
          name: dto.requesterName.trim(),
          authProvider: 'local',
          isActive: true,
          passwordLoginDisabled: true,
          roles: { create: { roleId: role.id } },
        },
        include: { roles: { include: { role: true } } },
      });
    }

    const ticket = await this.tickets.create(
      {
        title: dto.subject,
        description: dto.description,
        requesterId: requester.id,
        categoryId: dto.categoryId,
        priority: dto.priority,
      },
      null,
      'web_public',
    );

    const token = await this.auth.createMagicLink(ticket.id, requester.id);
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = `${frontendUrl}/status/${token}`;

    await this.email.sendOutbound(
      {
        to: [email],
        subject: `Your ticket #${ticket.number} link`,
        bodyText: `Thanks for your request.\n\nTrack and reply here:\n${url}\n\nTicket: #${ticket.number} - ${ticket.title}\n`,
      },
      ticket.id,
    );

    return { ticketId: ticket.id, magicLinkSent: true };
  }

  async confirmResolution(token: string) {
    const link = await this.auth.validateMagicLink(token);
    const ticket = await this.prisma.ticket.findUnique({ where: { id: link.ticketId } });
    if (!ticket || ticket.status !== 'resolved') {
      throw new NotFoundException('Ticket not in resolved state');
    }
    return this.prisma.ticket.update({
      where: { id: link.ticketId },
      data: { status: 'closed', closedAt: new Date() },
    });
  }
}
