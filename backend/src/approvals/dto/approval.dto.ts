import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  MinLength,
} from 'class-validator';

export class CreateApprovalDto {
  @IsString()
  ticketId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['sequential', 'parallel', 'any'])
  approvalType?: 'sequential' | 'parallel' | 'any';

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsArray()
  @IsString({ each: true })
  approverUserIds!: string[];
}

export class DecideApprovalDto {
  @IsEnum(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}

export class DecideByTokenDto {
  @IsString()
  token!: string;

  @IsEnum(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
