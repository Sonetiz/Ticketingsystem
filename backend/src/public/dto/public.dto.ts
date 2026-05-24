import { IsString, MinLength, MaxLength } from 'class-validator';

export class PublicReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
