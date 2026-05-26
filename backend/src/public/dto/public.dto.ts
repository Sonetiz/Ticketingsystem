import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PublicCreateTicketDto {
  @IsEmail()
  @MaxLength(320)
  requesterEmail!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  requesterName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priority?: string;
}

export class PublicReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
