import { IsString, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSoftwareLicenseDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsTotal?: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  renewalCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSoftwareLicenseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsTotal?: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  renewalCost?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
