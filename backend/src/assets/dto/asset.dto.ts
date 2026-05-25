import {
  IsString,
  IsOptional,
  IsObject,
  IsIn,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const ASSET_STATUSES = ['in_use', 'in_storage', 'maintenance', 'retired', 'lost'] as const;
export const ASSET_LIFECYCLE_STAGES = ['planning', 'deployed', 'retired'] as const;
export const ASSET_RELATION_TYPES = [
  'runs_on',
  'depends_on',
  'installed_on',
  'connected_to',
  'part_of',
] as const;
export const TICKET_ASSET_RELATIONS = ['affected', 'involved', 'caused_by'] as const;

export class CreateAssetDto {
  @IsString()
  name!: string;

  @IsString()
  assetType!: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  primaryUserId?: string;

  @IsOptional()
  @IsIn([...ASSET_STATUSES])
  status?: string;

  @IsOptional()
  @IsIn([...ASSET_LIFECYCLE_STAGES])
  lifecycleStage?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  purchaseOrder?: string;

  @IsOptional()
  @IsDateString()
  warrantyEndsAt?: string;

  @IsOptional()
  @IsDateString()
  retiredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  assetType?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string | null;

  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @IsOptional()
  @IsUUID()
  primaryUserId?: string | null;

  @IsOptional()
  @IsIn([...ASSET_STATUSES])
  status?: string;

  @IsOptional()
  @IsIn([...ASSET_LIFECYCLE_STAGES])
  lifecycleStage?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number | null;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @IsOptional()
  @IsString()
  purchaseOrder?: string | null;

  @IsOptional()
  @IsDateString()
  warrantyEndsAt?: string | null;

  @IsOptional()
  @IsDateString()
  retiredAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AddAssetRelationshipDto {
  @IsUUID()
  targetAssetId!: string;

  @IsIn([...ASSET_RELATION_TYPES])
  relationType!: string;

  @IsIn(['downstream', 'upstream'])
  direction!: 'downstream' | 'upstream';
}

export class InstallSoftwareDto {
  @IsUUID()
  softwareLicenseId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  seatsUsed?: number;

  @IsOptional()
  @IsString()
  version?: string;
}

export class LinkTicketAssetDto {
  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsIn([...TICKET_ASSET_RELATIONS])
  relation?: string;
}
