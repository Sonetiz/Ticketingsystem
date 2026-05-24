import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateProblemDto {
  @IsString()
  ticketId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  workaround?: string;

  @IsOptional()
  @IsBoolean()
  isKnownError?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateProblemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  workaround?: string;

  @IsOptional()
  @IsBoolean()
  isKnownError?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}
