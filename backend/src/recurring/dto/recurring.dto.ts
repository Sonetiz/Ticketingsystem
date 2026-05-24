import { IsString, IsOptional, IsUUID, IsBoolean, IsInt, MinLength, MaxLength } from 'class-validator';

export class CreateRecurringTaskDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(3)
  titleTemplate!: string;

  @IsOptional()
  @IsString()
  descriptionTemplate?: string;

  @IsString()
  rrule!: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  assignedTeamId?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  dueDateOffsetHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
