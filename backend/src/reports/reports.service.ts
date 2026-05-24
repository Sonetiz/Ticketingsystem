import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async openByTeam() {
    const teams = await this.prisma.team.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedTickets: {
              where: { status: { notIn: ['resolved', 'closed', 'cancelled'] }, deletedAt: null },
            },
          },
        },
      },
    });
    return teams.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      count: t._count.assignedTickets,
    }));
  }

  async periodStats(from: Date, to: Date) {
    const [created, resolved] = await Promise.all([
      this.prisma.ticket.count({ where: { createdAt: { gte: from, lte: to }, deletedAt: null } }),
      this.prisma.ticket.count({
        where: { resolvedAt: { gte: from, lte: to }, deletedAt: null },
      }),
    ]);

    const resolvedTickets = await this.prisma.ticket.findMany({
      where: { resolvedAt: { gte: from, lte: to }, deletedAt: null },
      select: { createdAt: true, resolvedAt: true },
    });

    let totalResolutionMinutes = 0;
    for (const t of resolvedTickets) {
      if (t.resolvedAt) {
        totalResolutionMinutes += (t.resolvedAt.getTime() - t.createdAt.getTime()) / 60000;
      }
    }

    return {
      created,
      resolved,
      avgResponseMinutes: 0,
      avgResolutionMinutes: resolvedTickets.length
        ? Math.round(totalResolutionMinutes / resolvedTickets.length)
        : 0,
    };
  }

  async slaBreaches(from?: Date) {
    return this.prisma.slaBreachEvent.findMany({
      where: from ? { breachedAt: { gte: from } } : undefined,
      include: {
        ticket: { select: { id: true, number: true, title: true, priority: true } },
      },
      orderBy: { breachedAt: 'desc' },
      take: 100,
    });
  }

  async workloadByAgent() {
    const agents = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        assignedTickets: {
          some: { status: { notIn: ['resolved', 'closed', 'cancelled'] }, deletedAt: null },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedTickets: {
              where: { status: { notIn: ['resolved', 'closed', 'cancelled'] }, deletedAt: null },
            },
          },
        },
      },
    });
    return agents.map((a) => ({ agentId: a.id, agentName: a.name, count: a._count.assignedTickets }));
  }

  async ticketsByCategory() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            tickets: { where: { deletedAt: null, status: { notIn: ['closed', 'cancelled'] } } },
          },
        },
      },
    });
    return categories.map((c) => ({ categoryId: c.id, categoryName: c.name, count: c._count.tickets }));
  }
}
