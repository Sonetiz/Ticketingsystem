import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters?: { assetType?: string; serviceId?: string }) {
    const where: Prisma.AssetWhereInput = { deletedAt: null };
    if (filters?.assetType) where.assetType = filters.assetType;
    if (filters?.serviceId) where.serviceId = filters.serviceId;

    return this.prisma.asset.findMany({
      where,
      include: { service: { select: { id: true, name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  create(dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: {
        name: dto.name,
        assetType: dto.assetType,
        identifier: dto.identifier,
        serviceId: dto.serviceId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.assetType !== undefined && { assetType: dto.assetType }),
        ...(dto.identifier !== undefined && { identifier: dto.identifier }),
        ...(dto.serviceId !== undefined && { serviceId: dto.serviceId }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
      },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
