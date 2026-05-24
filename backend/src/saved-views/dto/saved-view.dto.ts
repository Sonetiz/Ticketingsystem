import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateSavedViewDto {
  @IsString()
  name!: string;

  @IsObject()
  filters!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSavedViewDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
