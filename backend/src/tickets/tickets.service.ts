import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';
import { SlaService } from '../sla/sla.service';
import { AuthService } from '../auth/auth.service';
import { isActiveQueueTicket, isTicketOnHold } from '../sla/sla.engine';
import { CreateTicketDto, UpdateTicketDto, AssignTicketDto, HoldTicketDto, TicketFilterDto } from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
    private readonly sla: SlaService,
    private readonly auth: AuthService,
  ) {}

  async create(dto: CreateTicketDto, actor: SessionUser | null, source = 'admin') {
    const defaultTeam = await this.prisma.team.findFirst({ where: { isDefault: true } });
    const createdAt = new Date();
    const priority = dto.priority ?? 'normal';
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : this.sla.calculateSlaTarget(priority, createdAt);

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        requesterId: dto.requesterId ?? actor?.id,
        affectedUserId: dto.affectedUserId,
        assigneeId: dto.assigneeId,
        assignedTeamId: dto.assignedTeamId ?? defaultTeam?.id,
        projectId: dto.projectId,
        categoryId: dto.categoryId,
        serviceId: dto.serviceId,
        priority,
        impact: dto.impact ?? 'medium',
        urgency: dto.urgency ?? 'medium',
        dueAt,
        slaTargetAt: dueAt,
        source,
        status: 'new',
        tags: dto.tags?.length
          ? { create: dto.tags.map((tag) => ({ tag })) }
          : undefined,
      },
      include: this.ticketInclude(),
    });

    await this.prisma.ticketStatusHistory.create({
      data: { ticketId: ticket.id, toStatus: 'new', actorId: actor?.id, source },
    });

    await this.audit.log({
      actorId: actor?.id,
      entityType: 'ticket',
      entityId: ticket.id,
      action: 'created',
      newValue: { title: ticket.title, number: ticket.number },
      source,
    });

    return ticket;
  }

  async findMany(filters: TicketFilterDto, user: SessionUser) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const where = await this.buildFilterWhere(filters, user);

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: this.ticketInclude(),
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: data.map((t) => this.toSummary(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async buildFilterWhere(
    filters: TicketFilterDto,
    user: SessionUser,
  ): Promise<Prisma.TicketWhereInput> {
    const where: Prisma.TicketWhereInput = { deletedAt: null };

    if (!this.rbac.hasPermission(user, 'ticket.read.all')) {
      where.OR = [
        { assigneeId: user.id },
        { requesterId: user.id },
        { assignedTeamId: { in: user.teamIds } },
      ];
    }

    if (filters.view === 'active') {
      where.status = { notIn: ['resolved', 'closed', 'cancelled'] };
      where.AND = [
        { OR: [{ holdUntil: null }, { holdUntil: { lte: new Date() } }] },
        { status: { notIn: ['on_hold', 'waiting_for_user', 'waiting_for_vendor', 'waiting_for_internal_team'] } },
      ];
    } else if (filters.view === 'mine') {
      where.assigneeId = user.id;
    } else if (filters.view === 'team') {
      where.assignedTeamId = { in: user.teamIds };
    } else if (filters.view === 'on-hold') {
      where.OR = [
        { holdUntil: { gt: new Date() } },
        { status: { in: ['on_hold', 'waiting_for_user', 'waiting_for_vendor', 'waiting_for_internal_team'] } },
      ];
    } else if (filters.view === 'overdue') {
      where.dueAt = { lt: new Date() };
      where.status = { notIn: ['resolved', 'closed', 'cancelled'] };
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.assignedTeamId) where.assignedTeamId = filters.assignedTeamId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.overdue) {
      where.dueAt = { lt: new Date() };
      where.status = { notIn: ['resolved', 'closed', 'cancelled'] };
    }
    if (filters.slaBreached) where.slaBreached = true;
    if (filters.onHold) {
      where.OR = [
        { holdUntil: { gt: new Date() } },
        { status: { in: ['on_hold', 'waiting_for_user', 'waiting_for_vendor', 'waiting_for_internal_team'] } },
      ];
    }
    if (filters.q) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : where.OR ? [where.OR] : []),
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
      if (/^\d+$/.test(filters.q)) {
        where.OR.push({ number: parseInt(filters.q, 10) });
      }
    }

    return where;
  }

  async findOne(id: string, user: SessionUser) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...this.ticketInclude(),
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true } },
            mentions: { include: { user: { select: { id: true, name: true } } } },
          },
        },
        attachments: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        priorityHistory: { orderBy: { createdAt: 'desc' } },
        assignmentHistory: { orderBy: { createdAt: 'desc' } },
        watchers: { include: { user: { select: { id: true, name: true } } } },
        tags: true,
        linksFrom: { include: { toTicket: { select: { id: true, number: true, title: true } } } },
        linksTo: { include: { fromTicket: { select: { id: true, number: true, title: true } } } },
        externalContacts: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const canAccess = await this.rbac.canAccessTicket(user, ticket);
    if (!canAccess) throw new ForbiddenException();

    return {
      ...ticket,
      isOnHold: isTicketOnHold(ticket),
      isActiveQueue: isActiveQueueTicket(ticket),
    };
  }

  async update(id: string, dto: UpdateTicketDto, actor: SessionUser) {
    const ticket = await this.getTicketOrThrow(id, actor);
    const data: Prisma.TicketUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.impact !== undefined) data.impact = dto.impact;
    if (dto.urgency !== undefined) data.urgency = dto.urgency;
    if (dto.dueAt !== undefined) data.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.projectId !== undefined) data.project = dto.projectId ? { connect: { id: dto.projectId } } : { disconnect: true };
    if (dto.categoryId !== undefined) data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };

    if (dto.status && dto.status !== ticket.status) {
      data.status = dto.status;
      if (['resolved', 'closed'].includes(dto.status)) {
        data.resolvedAt = dto.status === 'resolved' ? new Date() : ticket.resolvedAt;
        data.closedAt = dto.status === 'closed' ? new Date() : ticket.closedAt;
      }
      await this.prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: dto.status,
          actorId: actor.id,
        },
      });
      await this.audit.log({
        actorId: actor.id,
        entityType: 'ticket',
        entityId: id,
        action: 'status_changed',
        oldValue: { status: ticket.status },
        newValue: { status: dto.status },
      });
    }

    if (dto.priority && dto.priority !== ticket.priority) {
      await this.prisma.ticketPriorityHistory.create({
        data: {
          ticketId: id,
          fromPriority: ticket.priority,
          toPriority: dto.priority,
          reason: 'manual',
          actorId: actor.id,
        },
      });
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: this.ticketInclude(),
    });

    if (dto.tags) {
      await this.prisma.ticketTag.deleteMany({ where: { ticketId: id } });
      if (dto.tags.length) {
        await this.prisma.ticketTag.createMany({
          data: dto.tags.map((tag) => ({ ticketId: id, tag })),
        });
      }
    }

    return updated;
  }

  async assign(id: string, dto: AssignTicketDto, actor: SessionUser) {
    const ticket = await this.getTicketOrThrow(id, actor);
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        assigneeId: dto.assigneeId,
        assignedTeamId: dto.assignedTeamId,
      },
      include: this.ticketInclude(),
    });

    await this.prisma.ticketAssignmentHistory.create({
      data: {
        ticketId: id,
        fromAssigneeId: ticket.assigneeId,
        toAssigneeId: dto.assigneeId,
        fromTeamId: ticket.assignedTeamId,
        toTeamId: dto.assignedTeamId,
        actorId: actor.id,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      entityType: 'ticket',
      entityId: id,
      action: 'assigned',
      oldValue: { assigneeId: ticket.assigneeId, teamId: ticket.assignedTeamId },
      newValue: { assigneeId: dto.assigneeId, teamId: dto.assignedTeamId },
    });

    return updated;
  }

  async hold(id: string, dto: HoldTicketDto, actor: SessionUser) {
    const ticket = await this.getTicketOrThrow(id, actor);
    const holdUntil = dto.holdUntil ? new Date(dto.holdUntil) : null;

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        holdUntil,
        holdReason: dto.holdReason,
        holdNote: dto.holdNote,
        holdById: actor.id,
        status: 'on_hold',
      },
      include: this.ticketInclude(),
    });

    await this.prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: actor.id,
        kind: 'system',
        body: `Ticket placed on hold: ${dto.holdReason}${dto.holdNote ? ` - ${dto.holdNote}` : ''}`,
        isPublic: false,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      entityType: 'ticket',
      entityId: id,
      action: 'hold_placed',
      newValue: { holdReason: dto.holdReason, holdUntil },
    });

    return updated;
  }

  async unhold(id: string, actor: SessionUser) {
    const ticket = await this.getTicketOrThrow(id, actor);
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        holdUntil: null,
        holdReason: null,
        holdNote: null,
        holdById: null,
        status: ticket.status === 'on_hold' ? 'open' : ticket.status,
      },
      include: this.ticketInclude(),
    });

    await this.prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: actor.id,
        kind: 'system',
        body: 'Hold removed',
        isPublic: false,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      entityType: 'ticket',
      entityId: id,
      action: 'hold_released',
    });

    return updated;
  }

  async merge(sourceId: string, targetId: string, actor: SessionUser) {
    if (sourceId === targetId) throw new BadRequestException('Cannot merge ticket with itself');
    const [source, target] = await Promise.all([
      this.getTicketOrThrow(sourceId, actor),
      this.getTicketOrThrow(targetId, actor),
    ]);

    await this.prisma.ticketMessage.updateMany({
      where: { ticketId: sourceId },
      data: { ticketId: targetId },
    });

    await this.prisma.ticketLink.create({
      data: { fromTicketId: sourceId, toTicketId: targetId, linkType: 'merged_into' },
    });

    await this.prisma.ticket.update({
      where: { id: sourceId },
      data: { status: 'closed', closedAt: new Date() },
    });

    await this.prisma.ticketMessage.create({
      data: {
        ticketId: targetId,
        authorId: actor.id,
        kind: 'system',
        body: `Merged ticket #${source.number} into this ticket`,
        isPublic: false,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      entityType: 'ticket',
      entityId: sourceId,
      action: 'merged',
      newValue: { mergedInto: targetId },
    });

    return this.findOne(targetId, actor);
  }

  async split(id: string, titles: string[], actor: SessionUser) {
    const parent = await this.getTicketOrThrow(id, actor);
    const children = [];

    for (const title of titles) {
      const child = await this.create(
        { title, description: `Split from ticket #${parent.number}`, projectId: parent.projectId ?? undefined },
        actor,
      );
      await this.prisma.ticket.update({
        where: { id: child.id },
        data: { parentTicketId: id },
      });
      await this.prisma.ticketLink.create({
        data: { fromTicketId: id, toTicketId: child.id, linkType: 'split_from' },
      });
      children.push(child);
    }

    await this.audit.log({
      actorId: actor.id,
      entityType: 'ticket',
      entityId: id,
      action: 'split',
      newValue: { childIds: children.map((c) => c.id) },
    });

    return children;
  }

  async link(fromId: string, toId: string, linkType: string, actor: SessionUser) {
    await this.getTicketOrThrow(fromId, actor);
    await this.getTicketOrThrow(toId, actor);
    return this.prisma.ticketLink.create({
      data: { fromTicketId: fromId, toTicketId: toId, linkType },
    });
  }

  async addWatcher(ticketId: string, userId: string, actor: SessionUser) {
    await this.getTicketOrThrow(ticketId, actor);
    return this.prisma.ticketWatcher.upsert({
      where: { ticketId_userId: { ticketId, userId } },
      create: { ticketId, userId },
      update: {},
    });
  }

  async generateMagicLink(ticketId: string, actor: SessionUser) {
    await this.getTicketOrThrow(ticketId, actor);
    const token = await this.auth.createMagicLink(ticketId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return { url: `${frontendUrl}/status/${token}` };
  }

  async getDashboardStats(user: SessionUser) {
    const baseWhere: Prisma.TicketWhereInput = { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } };
    const [openTickets, myAssigned, onHold, overdue, slaBreached, resolvedToday] = await Promise.all([
      this.prisma.ticket.count({ where: { ...baseWhere, status: { notIn: ['resolved', 'closed', 'cancelled'] } } }),
      this.prisma.ticket.count({ where: { ...baseWhere, assigneeId: user.id } }),
      this.prisma.ticket.count({
        where: {
          deletedAt: null,
          OR: [
            { holdUntil: { gt: new Date() } },
            { status: { in: ['on_hold', 'waiting_for_user', 'waiting_for_vendor'] } },
          ],
        },
      }),
      this.prisma.ticket.count({
        where: { deletedAt: null, dueAt: { lt: new Date() }, status: { notIn: ['resolved', 'closed', 'cancelled'] } },
      }),
      this.prisma.ticket.count({ where: { deletedAt: null, slaBreached: true, status: { notIn: ['closed'] } } }),
      this.prisma.ticket.count({
        where: {
          deletedAt: null,
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const teamQueue = await this.prisma.ticket.count({
      where: {
        deletedAt: null,
        assignedTeamId: { in: user.teamIds },
        status: { notIn: ['resolved', 'closed', 'cancelled'] },
      },
    });

    return { openTickets, myAssigned, teamQueue, onHold, overdue, slaBreached, resolvedToday };
  }

  private async getTicketOrThrow(id: string, user: SessionUser) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const canAccess = await this.rbac.canAccessTicket(user, ticket);
    if (!canAccess) throw new ForbiddenException();
    return ticket;
  }

  private ticketInclude() {
    return {
      requester: { select: { id: true, name: true, email: true } },
      affectedUser: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      assignedTeam: { select: { id: true, name: true, slug: true } },
      project: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      tags: true,
    };
  }

  private toSummary(ticket: {
    id: string;
    number: number;
    title: string;
    status: string;
    priority: string;
    dueAt: Date | null;
    holdUntil: Date | null;
    updatedAt: Date;
    createdAt: Date;
    assignee: { id: string; name: string } | null;
    assignedTeam: { id: string; name: string } | null;
    requester: { id: string; name: string; email: string } | null;
  }) {
    return {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      dueAt: ticket.dueAt?.toISOString() ?? null,
      isOnHold: isTicketOnHold({ holdUntil: ticket.holdUntil, status: ticket.status }),
      assignee: ticket.assignee,
      assignedTeam: ticket.assignedTeam,
      requester: ticket.requester,
      updatedAt: ticket.updatedAt.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}
