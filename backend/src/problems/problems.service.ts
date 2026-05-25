import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeHtml } from '../common/sanitize';
import { CreateProblemDto, UpdateProblemDto } from './dto/problem.dto';

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.problemRecord.findMany({
      where: status ? { status } : {},
      include: {
        ticket: { select: { id: true, number: true, title: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findKnownErrors(q?: string) {
    return this.prisma.problemRecord.findMany({
      where: {
        isKnownError: true,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { rootCause: { contains: q, mode: 'insensitive' } },
                { workaround: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        ticket: { select: { id: true, number: true, title: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string) {
    const problem = await this.prisma.problemRecord.findUnique({
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
    if (!problem) throw new NotFoundException('Problem record not found');
    return {
      ...problem,
      assets: problem.linkedAssets.map((la) => ({ ...la.asset, relation: la.relation })),
    };
  }

  create(dto: CreateProblemDto) {
    return this.prisma.problemRecord.create({
      data: {
        ticketId: dto.ticketId,
        title: dto.title,
        rootCause: dto.rootCause ? sanitizeHtml(dto.rootCause) : undefined,
        workaround: dto.workaround ? sanitizeHtml(dto.workaround) : undefined,
        isKnownError: dto.isKnownError ?? false,
        status: dto.status ?? 'open',
      },
      include: {
        ticket: { select: { id: true, number: true, title: true } },
      },
    });
  }

  async update(id: string, dto: UpdateProblemDto) {
    await this.findOne(id);
    return this.prisma.problemRecord.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.rootCause !== undefined && { rootCause: sanitizeHtml(dto.rootCause) }),
        ...(dto.workaround !== undefined && { workaround: sanitizeHtml(dto.workaround) }),
        ...(dto.isKnownError !== undefined && { isKnownError: dto.isKnownError }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        ticket: { select: { id: true, number: true, title: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.problemRecord.delete({ where: { id } });
  }
}
