import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MessagesService } from '../messages/messages.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { PublicReplyDto } from './dto/public.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly messages: MessagesService,
    private readonly attachments: AttachmentsService,
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
