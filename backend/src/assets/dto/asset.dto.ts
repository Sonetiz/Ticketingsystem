import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  name!: string;

  @IsString()
  assetType!: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

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
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
