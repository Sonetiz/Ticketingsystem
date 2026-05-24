import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PublicService } from './public.service';
import { PublicReplyDto } from './dto/public.dto';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuthService } from '../auth/auth.service';

@ApiTags('public')
@Controller('public/tickets')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly attachments: AttachmentsService,
    private readonly auth: AuthService,
  ) {}

  @Get(':token')
  getTicket(@Param('token') token: string) {
    return this.publicService.getTicketByMagicLink(token);
  }

  @Post(':token/reply')
  reply(@Param('token') token: string, @Body() dto: PublicReplyDto) {
    return this.publicService.reply(token, dto);
  }

  @Post(':token/confirm-resolution')
  confirmResolution(@Param('token') token: string) {
    return this.publicService.confirmResolution(token);
  }

  @Post(':token/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Param('token') token: string, @UploadedFile() file: Express.Multer.File) {
    const link = await this.auth.validateMagicLink(token);
    const attachment = await this.attachments.save(link.ticketId, file, undefined, true);
    return {
      ...attachment,
      downloadUrl: this.attachments.signDownloadUrl(attachment.id),
    };
  }
}
