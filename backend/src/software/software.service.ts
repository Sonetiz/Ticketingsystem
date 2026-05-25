import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSoftwareLicenseDto, UpdateSoftwareLicenseDto } from './dto/software.dto';

@Injectable()
export class SoftwareService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const licenses = await this.prisma.softwareLicense.findMany({
      where: { deletedAt: null },
      include: {
        installations: {
          include: {
            asset: { select: { id: true, name: true, assetType: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return licenses.map((l) => this.enrichLicense(l));
  }

  async findOne(id: string) {
    const license = await this.prisma.softwareLicense.findFirst({
      where: { id, deletedAt: null },
      include: {
        installations: {
          include: {
            asset: { select: { id: true, name: true, assetType: true, identifier: true } },
          },
        },
      },
    });
    if (!license) throw new NotFoundException('Software license not found');
    return this.enrichLicense(license);
  }

  create(dto: CreateSoftwareLicenseDto) {
    return this.prisma.softwareLicense.create({
      data: {
        name: dto.name,
        vendor: dto.vendor,
        licenseKey: dto.licenseKey,
        seatsTotal: dto.seatsTotal ?? 1,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        renewalCost: dto.renewalCost !== undefined ? new Prisma.Decimal(dto.renewalCost) : undefined,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateSoftwareLicenseDto) {
    await this.findOne(id);
    const data: Prisma.SoftwareLicenseUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.vendor !== undefined) data.vendor = dto.vendor;
    if (dto.licenseKey !== undefined) data.licenseKey = dto.licenseKey;
    if (dto.seatsTotal !== undefined) {
      const seatsUsed = await this.getSeatsUsed(id);
      if (dto.seatsTotal < seatsUsed) {
        throw new BadRequestException(`Cannot reduce seats below current usage (${seatsUsed})`);
      }
      data.seatsTotal = dto.seatsTotal;
    }
    if (dto.purchaseDate !== undefined) {
      data.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
    }
    if (dto.expiryDate !== undefined) {
      data.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    }
    if (dto.renewalCost !== undefined) {
      data.renewalCost =
        dto.renewalCost === null ? null : new Prisma.Decimal(dto.renewalCost);
    }
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.softwareLicense.update({ where: { id }, data });
  }

  async remove(id: string, force = false) {
    const license = await this.findOne(id);
    if (license.installations.length > 0 && !force) {
      throw new BadRequestException(
        'License has active installations. Use force=true to delete anyway.',
      );
    }
    if (force && license.installations.length > 0) {
      await this.prisma.assetSoftware.deleteMany({ where: { softwareLicenseId: id } });
    }
    return this.prisma.softwareLicense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getSeatsUsed(licenseId: string): Promise<number> {
    const agg = await this.prisma.assetSoftware.aggregate({
      where: { softwareLicenseId: licenseId },
      _sum: { seatsUsed: true },
    });
    return agg._sum.seatsUsed ?? 0;
  }

  private enrichLicense(
    license: {
      id: string;
      name: string;
      vendor: string | null;
      licenseKey: string | null;
      seatsTotal: number;
      purchaseDate: Date | null;
      expiryDate: Date | null;
      renewalCost: Prisma.Decimal | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
      installations: Array<{
        assetId: string;
        seatsUsed: number;
        version: string | null;
        installedAt: Date | null;
        asset: { id: string; name: string; assetType: string; identifier?: string | null };
      }>;
    },
  ) {
    const seatsUsed = license.installations.reduce((sum, i) => sum + i.seatsUsed, 0);
    return {
      ...license,
      seatsUsed,
      seatsAvailable: license.seatsTotal - seatsUsed,
    };
  }
}
