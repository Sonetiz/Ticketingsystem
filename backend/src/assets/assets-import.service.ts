import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ASSET_LIFECYCLE_STAGES, ASSET_STATUSES } from './dto/asset.dto';

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
}

@Injectable()
export class AssetsImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCsv(csvContent: string, dryRun = false): Promise<ImportResult> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must contain a header row and at least one data row');
    }

    const headers = this.parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const required = ['name', 'assettype'];
    for (const col of required) {
      if (!headers.includes(col)) {
        throw new BadRequestException(`Missing required column: ${col}`);
      }
    }

    const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.every((v) => !v.trim())) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (values[idx] ?? '').trim();
      });

      try {
        await this.processRow(row, i + 1, dryRun, result);
      } catch (err) {
        result.errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  private async processRow(
    row: Record<string, string>,
    rowNum: number,
    dryRun: boolean,
    result: ImportResult,
  ) {
    const name = row.name;
    const assetType = row.assettype || row['asset_type'];
    if (!name || !assetType) {
      result.errors.push({ row: rowNum, message: 'name and assetType are required' });
      return;
    }

    const status = row.status || 'in_use';
    const lifecycleStage = row.lifecyclestage || row['lifecycle_stage'] || 'deployed';
    if (!ASSET_STATUSES.includes(status as (typeof ASSET_STATUSES)[number])) {
      result.errors.push({ row: rowNum, message: `Invalid status: ${status}` });
      return;
    }
    if (!ASSET_LIFECYCLE_STAGES.includes(lifecycleStage as (typeof ASSET_LIFECYCLE_STAGES)[number])) {
      result.errors.push({ row: rowNum, message: `Invalid lifecycleStage: ${lifecycleStage}` });
      return;
    }

    let ownerId: string | undefined;
    let primaryUserId: string | undefined;
    let serviceId: string | undefined;

    if (row.owneremail || row['owner_email']) {
      const email = (row.owneremail || row['owner_email']).toLowerCase();
      const owner = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
      if (!owner) {
        result.errors.push({ row: rowNum, message: `Owner not found: ${email}` });
        return;
      }
      ownerId = owner.id;
    }

    if (row.primaryuseremail || row['primary_user_email']) {
      const email = (row.primaryuseremail || row['primary_user_email']).toLowerCase();
      const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
      if (!user) {
        result.errors.push({ row: rowNum, message: `Primary user not found: ${email}` });
        return;
      }
      primaryUserId = user.id;
    }

    if (row.serviceslug || row['service_slug']) {
      const slug = row.serviceslug || row['service_slug'];
      const service = await this.prisma.service.findFirst({ where: { slug, deletedAt: null } });
      if (!service) {
        result.errors.push({ row: rowNum, message: `Service not found: ${slug}` });
        return;
      }
      serviceId = service.id;
    }

    const data: Prisma.AssetCreateInput = {
      name,
      assetType,
      identifier: row.identifier || undefined,
      serialNumber: row.serialnumber || row['serial_number'] || undefined,
      model: row.model || undefined,
      vendor: row.vendor || undefined,
      location: row.location || undefined,
      status,
      lifecycleStage,
      notes: row.notes || undefined,
      purchaseOrder: row.purchaseorder || row['purchase_order'] || undefined,
      purchaseDate: this.parseDate(row.purchasedate || row['purchase_date']),
      warrantyEndsAt: this.parseDate(row.warrantyendsat || row['warranty_ends_at']),
      cost: row.cost ? new Prisma.Decimal(row.cost) : undefined,
      ...(ownerId && { owner: { connect: { id: ownerId } } }),
      ...(primaryUserId && { primaryUser: { connect: { id: primaryUserId } } }),
      ...(serviceId && { service: { connect: { id: serviceId } } }),
    };

    const identifier = row.identifier;
    let existing = identifier
      ? await this.prisma.asset.findFirst({ where: { identifier, deletedAt: null } })
      : await this.prisma.asset.findFirst({ where: { name, assetType, deletedAt: null } });

    if (dryRun) {
      if (existing) result.updated++;
      else result.created++;
      return;
    }

    if (existing) {
      await this.prisma.asset.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          assetType: data.assetType,
          identifier: data.identifier,
          serialNumber: data.serialNumber,
          model: data.model,
          vendor: data.vendor,
          location: data.location,
          status: data.status,
          lifecycleStage: data.lifecycleStage,
          notes: data.notes,
          purchaseOrder: data.purchaseOrder,
          purchaseDate: data.purchaseDate,
          warrantyEndsAt: data.warrantyEndsAt,
          cost: data.cost,
          ownerId,
          primaryUserId,
          serviceId,
        },
      });
      result.updated++;
    } else {
      await this.prisma.asset.create({
        data: {
          name: data.name,
          assetType: data.assetType,
          identifier: data.identifier,
          serialNumber: data.serialNumber,
          model: data.model,
          vendor: data.vendor,
          location: data.location,
          status: data.status!,
          lifecycleStage: data.lifecycleStage!,
          notes: data.notes,
          purchaseOrder: data.purchaseOrder,
          purchaseDate: data.purchaseDate,
          warrantyEndsAt: data.warrantyEndsAt,
          cost: data.cost,
          ownerId,
          primaryUserId,
          serviceId,
        },
      });
      result.created++;
    }
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
}
