import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { CreateWorklogDto, UpdateWorklogDto } from './dto/worklog.dto';

@Injectable()
export class WorklogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async findByTicket(ticketId: string, user: SessionUser) {
    await this.assertTicketAccess(ticketId, user);
    return this.prisma.worklogEntry.findMany({
      where: { ticketId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  async create(ticketId: string, dto: CreateWorklogDto, user: SessionUser) {
    await this.assertTicketAccess(ticketId, user);

    const startedAt = new Date(dto.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : undefined;
    const durationSeconds =
      dto.durationSeconds ??
      (endedAt ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)) : undefined);

    return this.prisma.worklogEntry.create({
      data: {
        ticketId,
        userId: user.id,
        startedAt,
        endedAt,
        durationSeconds,
        billable: dto.billable ?? false,
        note: dto.note,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async update(id: string, dto: UpdateWorklogDto, user: SessionUser) {
    const entry = await this.prisma.worklogEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Worklog entry not found');
    await this.assertTicketAccess(entry.ticketId, user);
    if (entry.userId !== user.id && !this.rbac.hasPermission(user, 'ticket.read.all')) {
      throw new ForbiddenException();
    }

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : entry.startedAt;
    const endedAt = dto.endedAt !== undefined ? (dto.endedAt ? new Date(dto.endedAt) : null) : entry.endedAt;
    const durationSeconds =
      dto.durationSeconds ??
      (endedAt && startedAt
        ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
        : entry.durationSeconds);

    return this.prisma.worklogEntry.update({
      where: { id },
      data: {
        ...(dto.startedAt !== undefined && { startedAt }),
        ...(dto.endedAt !== undefined && { endedAt }),
        ...(durationSeconds !== undefined && { durationSeconds }),
        ...(dto.billable !== undefined && { billable: dto.billable }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: string, user: SessionUser) {
    const entry = await this.prisma.worklogEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Worklog entry not found');
    await this.assertTicketAccess(entry.ticketId, user);
    if (entry.userId !== user.id && !this.rbac.hasPermission(user, 'ticket.read.all')) {
      throw new ForbiddenException();
    }
    return this.prisma.worklogEntry.delete({ where: { id } });
  }

  private async assertTicketAccess(ticketId: string, user: SessionUser) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const canAccess = await this.rbac.canAccessTicket(user, ticket);
    if (!canAccess) throw new ForbiddenException();
  }
}
