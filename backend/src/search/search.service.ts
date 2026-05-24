import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { isFtsAvailable } from '../common/fts';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async search(q: string, user: SessionUser, limit = 10) {
    const query = q.trim();
    if (!query) {
      return { tickets: [], knowledgeBase: [], assets: [], users: [] };
    }

    const [tickets, knowledgeBase, assets, users] = await Promise.all([
      this.searchTickets(query, user, limit),
      this.rbac.hasPermission(user, 'kb.read')
        ? this.searchKnowledgeBase(query, limit)
        : Promise.resolve([]),
      this.rbac.hasPermission(user, 'asset.read')
        ? this.searchAssets(query, limit)
        : Promise.resolve([]),
      this.canSearchUsers(user) ? this.searchUsers(query, limit) : Promise.resolve([]),
    ]);

    const results = [
      ...tickets.map((ticket) => ({
        type: 'ticket',
        id: ticket.id,
        title: `#${ticket.number} ${ticket.title}`,
        subtitle: `${ticket.status.replace(/_/g, ' ')} - ${ticket.priority}`,
        href: `/portal/tickets/${ticket.id}`,
      })),
      ...knowledgeBase.map((article) => ({
        type: 'kb',
        id: article.id,
        title: article.title,
        subtitle: article.category ?? 'Knowledge base',
        href: '/portal/knowledge-base',
      })),
      ...assets.map((asset) => ({
        type: 'asset',
        id: asset.id,
        title: asset.name,
        subtitle: [asset.assetType, asset.identifier].filter(Boolean).join(' - '),
        href: '/portal/assets',
      })),
    ].slice(0, limit);

    return { results, tickets, knowledgeBase, assets, users };
  }

  private canSearchUsers(user: SessionUser): boolean {
    return (
      this.rbac.hasPermission(user, 'manage.users') ||
      this.rbac.hasPermission(user, 'ticket.read.all')
    );
  }

  private async ticketScopeWhere(user: SessionUser): Promise<Prisma.TicketWhereInput> {
    const where: Prisma.TicketWhereInput = { deletedAt: null };
    if (!this.rbac.hasPermission(user, 'ticket.read.all')) {
      where.OR = [
        { assigneeId: user.id },
        { requesterId: user.id },
        { assignedTeamId: { in: user.teamIds } },
        { watchers: { some: { userId: user.id } } },
      ];
    }
    return where;
  }

  private async searchTickets(q: string, user: SessionUser, limit: number) {
    const scope = await this.ticketScopeWhere(user);

    const searchOr: Prisma.TicketWhereInput[] = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
    if (/^\d+$/.test(q)) {
      searchOr.push({ number: parseInt(q, 10) });
    }

    if (await isFtsAvailable(this.prisma)) {
      const ids = await this.ftsTicketIds(q, user);
      if (ids.length > 0) {
        searchOr.unshift({ id: { in: ids } });
      }
      return this.prisma.ticket.findMany({
        where: { AND: [scope, { OR: searchOr }] },
        select: this.ticketSelect(),
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
    }

    return this.prisma.ticket.findMany({
      where: { AND: [scope, { OR: searchOr }] },
      select: this.ticketSelect(),
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async ftsTicketIds(q: string, user: SessionUser): Promise<string[]> {
    const tsQuery = q.trim();
    if (!tsQuery) return [];

    if (this.rbac.hasPermission(user, 'ticket.read.all')) {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        WITH query AS (SELECT websearch_to_tsquery('english', ${tsQuery}) AS tsq)
        SELECT t.id
        FROM "Ticket" t
        LEFT JOIN "TicketMessage" m ON m."ticketId" = t.id
        CROSS JOIN query
        WHERE t."deletedAt" IS NULL
          AND (
            t."searchVector" @@ query.tsq
            OR m."searchVector" @@ query.tsq
          )
        GROUP BY t.id, t."searchVector", query.tsq
        ORDER BY GREATEST(
          ts_rank(t."searchVector", query.tsq),
          COALESCE(MAX(ts_rank(m."searchVector", query.tsq)), 0)
        ) DESC
        LIMIT 50
      `;
      return rows.map((r) => r.id);
    }

    const teamScope = user.teamIds.length
      ? Prisma.sql`OR t."assignedTeamId" IN (${Prisma.join(user.teamIds)})`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH query AS (SELECT websearch_to_tsquery('english', ${tsQuery}) AS tsq)
      SELECT t.id
      FROM "Ticket" t
      LEFT JOIN "TicketMessage" m ON m."ticketId" = t.id
      CROSS JOIN query
      WHERE t."deletedAt" IS NULL
        AND (
          t."assigneeId" = ${user.id}
          OR t."requesterId" = ${user.id}
          ${teamScope}
          OR EXISTS (
            SELECT 1 FROM "TicketWatcher" w
            WHERE w."ticketId" = t.id AND w."userId" = ${user.id}
          )
        )
        AND (
          t."searchVector" @@ query.tsq
          OR m."searchVector" @@ query.tsq
        )
      GROUP BY t.id, t."searchVector", query.tsq
      ORDER BY GREATEST(
        ts_rank(t."searchVector", query.tsq),
        COALESCE(MAX(ts_rank(m."searchVector", query.tsq)), 0)
      ) DESC
      LIMIT 50
    `;
    return rows.map((r) => r.id);
  }

  private ticketSelect() {
    return {
      id: true,
      number: true,
      title: true,
      status: true,
      priority: true,
    };
  }

  private async searchKnowledgeBase(q: string, limit: number) {
    if (await isFtsAvailable(this.prisma)) {
      try {
        const rows = await this.prisma.$queryRaw<
          { id: string; title: string; slug: string; category: string | null }[]
        >`
          SELECT id, title, slug, category
          FROM "KnowledgeArticle"
          WHERE "deletedAt" IS NULL
            AND "searchVector" @@ plainto_tsquery('english', ${q})
          ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${q})) DESC
          LIMIT ${limit}
        `;
        return rows;
      } catch {
        // fall through to contains
      }
    }

    return this.prisma.knowledgeArticle.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, slug: true, category: true },
      take: limit,
    });
  }

  private async searchAssets(q: string, limit: number) {
    return this.prisma.asset.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { identifier: { contains: q, mode: 'insensitive' } },
          { assetType: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, assetType: true, identifier: true },
      take: limit,
    });
  }

  private async searchUsers(q: string, limit: number) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: limit,
    });
  }
}
