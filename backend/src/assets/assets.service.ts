import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AddAssetRelationshipDto,
  InstallSoftwareDto,
} from './dto/asset.dto';
import { assetSummarySelect, userSummarySelect } from './assets.constants';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters?: {
    assetType?: string;
    serviceId?: string;
    ownerId?: string;
    primaryUserId?: string;
    status?: string;
    lifecycleStage?: string;
    q?: string;
  }) {
    const where: Prisma.AssetWhereInput = { deletedAt: null };
    if (filters?.assetType) where.assetType = filters.assetType;
    if (filters?.serviceId) where.serviceId = filters.serviceId;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.primaryUserId) where.primaryUserId = filters.primaryUserId;
    if (filters?.status) where.status = filters.status;
    if (filters?.lifecycleStage) where.lifecycleStage = filters.lifecycleStage;
    if (filters?.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { identifier: { contains: filters.q, mode: 'insensitive' } },
        { serialNumber: { contains: filters.q, mode: 'insensitive' } },
        { location: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.asset.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, slug: true } },
        owner: { select: userSummarySelect },
        primaryUser: { select: userSummarySelect },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        service: { select: { id: true, name: true, slug: true } },
        owner: { select: userSummarySelect },
        primaryUser: { select: userSummarySelect },
        parentRelationships: {
          include: {
            parentAsset: { select: assetSummarySelect },
          },
        },
        childRelationships: {
          include: {
            childAsset: { select: assetSummarySelect },
          },
        },
        software: {
          include: {
            softwareLicense: {
              select: {
                id: true,
                name: true,
                vendor: true,
                seatsTotal: true,
                expiryDate: true,
              },
            },
          },
        },
        linkedTickets: {
          include: {
            ticket: {
              select: { id: true, number: true, title: true, status: true },
            },
          },
        },
        linkedChanges: {
          include: {
            changeRequest: {
              select: {
                id: true,
                status: true,
                ticket: { select: { id: true, number: true, title: true } },
              },
            },
          },
        },
        linkedProblems: {
          include: {
            problemRecord: {
              select: {
                id: true,
                title: true,
                status: true,
                ticket: { select: { id: true, number: true } },
              },
            },
          },
        },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  create(dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: this.buildCreateData(dto),
      include: this.listInclude(),
    });
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: this.buildUpdateData(dto),
      include: this.listInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addRelationship(assetId: string, dto: AddAssetRelationshipDto) {
    await this.findOne(assetId);
    await this.findOne(dto.targetAssetId);

    if (assetId === dto.targetAssetId) {
      throw new BadRequestException('Cannot relate an asset to itself');
    }

    const parentAssetId = dto.direction === 'downstream' ? assetId : dto.targetAssetId;
    const childAssetId = dto.direction === 'downstream' ? dto.targetAssetId : assetId;

    const existing = await this.prisma.assetRelationship.findFirst({
      where: { parentAssetId, childAssetId, relationType: dto.relationType },
    });
    if (existing) {
      throw new ConflictException('Relationship already exists');
    }

    return this.prisma.assetRelationship.create({
      data: {
        parentAssetId,
        childAssetId,
        relationType: dto.relationType,
      },
      include: {
        parentAsset: { select: assetSummarySelect },
        childAsset: { select: assetSummarySelect },
      },
    });
  }

  async removeRelationship(assetId: string, relId: string) {
    const rel = await this.prisma.assetRelationship.findFirst({
      where: {
        id: relId,
        OR: [{ parentAssetId: assetId }, { childAssetId: assetId }],
      },
    });
    if (!rel) throw new NotFoundException('Relationship not found');
    return this.prisma.assetRelationship.delete({ where: { id: relId } });
  }

  async installSoftware(assetId: string, dto: InstallSoftwareDto) {
    await this.findOne(assetId);
    const license = await this.prisma.softwareLicense.findFirst({
      where: { id: dto.softwareLicenseId, deletedAt: null },
    });
    if (!license) throw new NotFoundException('Software license not found');

    const seatsUsed = dto.seatsUsed ?? 1;
    const existingInstalls = await this.prisma.assetSoftware.aggregate({
      where: { softwareLicenseId: dto.softwareLicenseId },
      _sum: { seatsUsed: true },
    });
    const currentSeats = existingInstalls._sum.seatsUsed ?? 0;
    const existingOnAsset = await this.prisma.assetSoftware.findUnique({
      where: {
        assetId_softwareLicenseId: { assetId, softwareLicenseId: dto.softwareLicenseId },
      },
    });
    const additionalSeats = existingOnAsset ? 0 : seatsUsed;
    if (currentSeats + additionalSeats > license.seatsTotal) {
      throw new BadRequestException('Not enough license seats available');
    }

    return this.prisma.assetSoftware.upsert({
      where: {
        assetId_softwareLicenseId: { assetId, softwareLicenseId: dto.softwareLicenseId },
      },
      create: {
        assetId,
        softwareLicenseId: dto.softwareLicenseId,
        seatsUsed,
        version: dto.version,
        installedAt: new Date(),
      },
      update: {
        seatsUsed,
        version: dto.version,
      },
      include: {
        softwareLicense: {
          select: { id: true, name: true, vendor: true, seatsTotal: true },
        },
      },
    });
  }

  async uninstallSoftware(assetId: string, licenseId: string) {
    const install = await this.prisma.assetSoftware.findUnique({
      where: { assetId_softwareLicenseId: { assetId, softwareLicenseId: licenseId } },
    });
    if (!install) throw new NotFoundException('Software installation not found');
    return this.prisma.assetSoftware.delete({
      where: { assetId_softwareLicenseId: { assetId, softwareLicenseId: licenseId } },
    });
  }

  async getTicketAssets(ticketId: string) {
    const links = await this.prisma.ticketAsset.findMany({
      where: { ticketId },
      include: {
        asset: {
          select: {
            ...assetSummarySelect,
            owner: { select: userSummarySelect },
            primaryUser: { select: userSummarySelect },
          },
        },
      },
    });
    return links.map((l) => ({ ...l.asset, relation: l.relation }));
  }

  async linkTicketAsset(ticketId: string, assetId: string, relation = 'affected') {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.findOne(assetId);

    return this.prisma.ticketAsset.upsert({
      where: { ticketId_assetId: { ticketId, assetId } },
      create: { ticketId, assetId, relation },
      update: { relation },
      include: { asset: { select: assetSummarySelect } },
    });
  }

  async unlinkTicketAsset(ticketId: string, assetId: string) {
    const link = await this.prisma.ticketAsset.findUnique({
      where: { ticketId_assetId: { ticketId, assetId } },
    });
    if (!link) throw new NotFoundException('Asset link not found');
    return this.prisma.ticketAsset.delete({
      where: { ticketId_assetId: { ticketId, assetId } },
    });
  }

  async getChangeAssets(changeRequestId: string) {
    const links = await this.prisma.changeAsset.findMany({
      where: { changeRequestId },
      include: { asset: { select: assetSummarySelect } },
    });
    return links.map((l) => ({ ...l.asset, relation: l.relation }));
  }

  async linkChangeAsset(changeRequestId: string, assetId: string, relation = 'impacted') {
    const change = await this.prisma.changeRequest.findUnique({ where: { id: changeRequestId } });
    if (!change) throw new NotFoundException('Change request not found');
    await this.findOne(assetId);

    return this.prisma.changeAsset.upsert({
      where: { changeRequestId_assetId: { changeRequestId, assetId } },
      create: { changeRequestId, assetId, relation },
      update: { relation },
      include: { asset: { select: assetSummarySelect } },
    });
  }

  async unlinkChangeAsset(changeRequestId: string, assetId: string) {
    const link = await this.prisma.changeAsset.findUnique({
      where: { changeRequestId_assetId: { changeRequestId, assetId } },
    });
    if (!link) throw new NotFoundException('Asset link not found');
    return this.prisma.changeAsset.delete({
      where: { changeRequestId_assetId: { changeRequestId, assetId } },
    });
  }

  async getProblemAssets(problemRecordId: string) {
    const links = await this.prisma.problemAsset.findMany({
      where: { problemRecordId },
      include: { asset: { select: assetSummarySelect } },
    });
    return links.map((l) => ({ ...l.asset, relation: l.relation }));
  }

  async linkProblemAsset(problemRecordId: string, assetId: string, relation = 'affected') {
    const problem = await this.prisma.problemRecord.findUnique({ where: { id: problemRecordId } });
    if (!problem) throw new NotFoundException('Problem record not found');
    await this.findOne(assetId);

    return this.prisma.problemAsset.upsert({
      where: { problemRecordId_assetId: { problemRecordId, assetId } },
      create: { problemRecordId, assetId, relation },
      update: { relation },
      include: { asset: { select: assetSummarySelect } },
    });
  }

  async unlinkProblemAsset(problemRecordId: string, assetId: string) {
    const link = await this.prisma.problemAsset.findUnique({
      where: { problemRecordId_assetId: { problemRecordId, assetId } },
    });
    if (!link) throw new NotFoundException('Asset link not found');
    return this.prisma.problemAsset.delete({
      where: { problemRecordId_assetId: { problemRecordId, assetId } },
    });
  }

  private listInclude() {
    return {
      service: { select: { id: true, name: true, slug: true } },
      owner: { select: userSummarySelect },
      primaryUser: { select: userSummarySelect },
    };
  }

  private buildCreateData(dto: CreateAssetDto): Prisma.AssetCreateInput {
    return {
      name: dto.name,
      assetType: dto.assetType,
      identifier: dto.identifier,
      status: dto.status ?? 'in_use',
      lifecycleStage: dto.lifecycleStage ?? 'deployed',
      location: dto.location,
      vendor: dto.vendor,
      model: dto.model,
      serialNumber: dto.serialNumber,
      cost: dto.cost !== undefined ? new Prisma.Decimal(dto.cost) : undefined,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      purchaseOrder: dto.purchaseOrder,
      warrantyEndsAt: dto.warrantyEndsAt ? new Date(dto.warrantyEndsAt) : undefined,
      retiredAt: dto.retiredAt ? new Date(dto.retiredAt) : undefined,
      notes: dto.notes,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      ...(dto.serviceId && { service: { connect: { id: dto.serviceId } } }),
      ...(dto.ownerId && { owner: { connect: { id: dto.ownerId } } }),
      ...(dto.primaryUserId && { primaryUser: { connect: { id: dto.primaryUserId } } }),
    };
  }

  private buildUpdateData(dto: UpdateAssetDto): Prisma.AssetUpdateInput {
    const data: Prisma.AssetUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.assetType !== undefined) data.assetType = dto.assetType;
    if (dto.identifier !== undefined) data.identifier = dto.identifier;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.lifecycleStage !== undefined) data.lifecycleStage = dto.lifecycleStage;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.vendor !== undefined) data.vendor = dto.vendor;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
    if (dto.cost !== undefined) data.cost = dto.cost === null ? null : new Prisma.Decimal(dto.cost);
    if (dto.purchaseDate !== undefined) {
      data.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
    }
    if (dto.purchaseOrder !== undefined) data.purchaseOrder = dto.purchaseOrder;
    if (dto.warrantyEndsAt !== undefined) {
      data.warrantyEndsAt = dto.warrantyEndsAt ? new Date(dto.warrantyEndsAt) : null;
    }
    if (dto.retiredAt !== undefined) {
      data.retiredAt = dto.retiredAt ? new Date(dto.retiredAt) : null;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.metadata !== undefined) data.metadata = dto.metadata as Prisma.InputJsonValue;
    if (dto.serviceId !== undefined) {
      data.service = dto.serviceId ? { connect: { id: dto.serviceId } } : { disconnect: true };
    }
    if (dto.ownerId !== undefined) {
      data.owner = dto.ownerId ? { connect: { id: dto.ownerId } } : { disconnect: true };
    }
    if (dto.primaryUserId !== undefined) {
      data.primaryUser = dto.primaryUserId
        ? { connect: { id: dto.primaryUserId } }
        : { disconnect: true };
    }
    return data;
  }
}
