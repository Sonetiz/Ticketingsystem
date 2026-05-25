import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeHtml } from '../common/sanitize';
import {
  CreateChangeRequestDto,
  UpdateChangeRequestDto,
  CreateFreezeWindowDto,
  UpdateFreezeWindowDto,
} from './dto/change.dto';

@Injectable()
export class ChangesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllChanges(status?: string) {
    return this.prisma.changeRequest.findMany({
      where: status ? { status } : {},
      include: {
        ticket: { select: { id: true, number: true, title: true, status: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async findChange(id: string) {
    const change = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: {
        ticket: { select: { id: true, number: true, title: true, status: true } },
        linkedAssets: {
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                assetType: true,
                identifier: true,
                status: true,
                lifecycleStage: true,
                location: true,
                serialNumber: true,
              },
            },
          },
        },
      },
    });
    if (!change) throw new NotFoundException('Change request not found');
    return {
      ...change,
      assets: change.linkedAssets.map((la) => ({ ...la.asset, relation: la.relation })),
    };
  }

  createChange(dto: CreateChangeRequestDto) {
    return this.prisma.changeRequest.create({
      data: {
        ticketId: dto.ticketId,
        changeType: dto.changeType,
        riskLevel: dto.riskLevel ?? 'low',
        impact: dto.impact ?? 'medium',
        plan: dto.plan ? sanitizeHtml(dto.plan) : undefined,
        rollback: dto.rollback ? sanitizeHtml(dto.rollback) : undefined,
        implementationPlan: dto.implementationPlan ? sanitizeHtml(dto.implementationPlan) : undefined,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
        status: dto.status ?? 'draft',
        freezeWindowAck: dto.freezeWindowAck ?? false,
      },
      include: {
        ticket: { select: { id: true, number: true, title: true } },
      },
    });
  }

  async updateChange(id: string, dto: UpdateChangeRequestDto) {
    await this.findChange(id);
    return this.prisma.changeRequest.update({
      where: { id },
      data: {
        ...(dto.changeType !== undefined && { changeType: dto.changeType }),
        ...(dto.riskLevel !== undefined && { riskLevel: dto.riskLevel }),
        ...(dto.impact !== undefined && { impact: dto.impact }),
        ...(dto.plan !== undefined && { plan: sanitizeHtml(dto.plan) }),
        ...(dto.rollback !== undefined && { rollback: sanitizeHtml(dto.rollback) }),
        ...(dto.implementationPlan !== undefined && {
          implementationPlan: sanitizeHtml(dto.implementationPlan),
        }),
        ...(dto.scheduledStart !== undefined && {
          scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : null,
        }),
        ...(dto.scheduledEnd !== undefined && {
          scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.freezeWindowAck !== undefined && { freezeWindowAck: dto.freezeWindowAck }),
      },
      include: {
        ticket: { select: { id: true, number: true, title: true } },
      },
    });
  }

  async removeChange(id: string) {
    await this.findChange(id);
    return this.prisma.changeRequest.delete({ where: { id } });
  }

  findAllFreezeWindows() {
    return this.prisma.freezeWindow.findMany({ orderBy: { startAt: 'asc' } });
  }

  async findFreezeWindow(id: string) {
    const window = await this.prisma.freezeWindow.findUnique({ where: { id } });
    if (!window) throw new NotFoundException('Freeze window not found');
    return window;
  }

  createFreezeWindow(dto: CreateFreezeWindowDto) {
    return this.prisma.freezeWindow.create({
      data: {
        name: dto.name,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        reason: dto.reason,
        scope: dto.scope ?? 'global',
      },
    });
  }

  async updateFreezeWindow(id: string, dto: UpdateFreezeWindowDto) {
    await this.findFreezeWindow(id);
    return this.prisma.freezeWindow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.scope !== undefined && { scope: dto.scope }),
      },
    });
  }

  async removeFreezeWindow(id: string) {
    await this.findFreezeWindow(id);
    return this.prisma.freezeWindow.delete({ where: { id } });
  }

  async getCalendar(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [changes, freezeWindows] = await Promise.all([
      this.prisma.changeRequest.findMany({
        where: {
          scheduledStart: { lte: toDate },
          scheduledEnd: { gte: fromDate },
        },
        include: {
          ticket: { select: { id: true, number: true, title: true } },
        },
      }),
      this.prisma.freezeWindow.findMany({
        where: {
          startAt: { lte: toDate },
          endAt: { gte: fromDate },
        },
      }),
    ]);

    return {
      changes: changes.map((c) => ({
        id: c.id,
        type: 'change',
        title: c.ticket.title,
        ticketNumber: c.ticket.number,
        changeType: c.changeType,
        status: c.status,
        start: c.scheduledStart?.toISOString() ?? null,
        end: c.scheduledEnd?.toISOString() ?? null,
        riskLevel: c.riskLevel,
      })),
      freezeWindows: freezeWindows.map((f) => ({
        id: f.id,
        type: 'freeze',
        title: f.name,
        start: f.startAt.toISOString(),
        end: f.endAt.toISOString(),
        reason: f.reason,
        scope: f.scope,
      })),
    };
  }
}
