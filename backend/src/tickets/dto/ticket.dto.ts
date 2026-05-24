import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsUUID()
  requesterId?: string;

  @IsOptional()
  @IsUUID()
  affectedUserId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  assignedTeamId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  impact?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  urgency?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTicketDto extends CreateTicketDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class AssignTicketDto {
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsUUID()
  assignedTeamId?: string | null;
}

export class HoldTicketDto {
  @IsOptional()
  @IsDateString()
  holdUntil?: string;

  @IsString()
  holdReason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  holdNote?: string;
}

export class TicketFilterDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  assignedTeamId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  view?: 'active' | 'mine' | 'team' | 'on-hold' | 'overdue' | 'recent' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  overdue?: boolean;

  @IsOptional()
  slaBreached?: boolean;

  @IsOptional()
  onHold?: boolean;
}

export class MergeTicketDto {
  @IsUUID()
  targetTicketId!: string;
}

export class SplitTicketDto {
  @IsArray()
  @IsString({ each: true })
  titles!: string[];
}

export class LinkTicketDto {
  @IsUUID()
  toTicketId!: string;

  @IsString()
  linkType!: string;
}
