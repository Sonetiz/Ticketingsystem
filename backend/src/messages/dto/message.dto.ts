import { IsString, IsEnum, IsOptional, IsArray, IsEmail, IsBoolean, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsEnum(['internal_note', 'public_reply'])
  kind!: 'internal_note' | 'public_reply';

  @IsOptional()
  @IsArray()
  mentionUserIds?: string[];
}

export class SendEmailDto {
  @IsArray()
  @IsEmail({}, { each: true })
  to!: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsString()
  subject!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
