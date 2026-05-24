import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { SessionAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';

@ApiTags('attachments')
@Controller()
export class AttachmentsController {
  constructor(
    private readonly attachments: AttachmentsService,
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  @Post('tickets/:ticketId/attachments')
  @UseGuards(SessionAuthGuard, CsrfGuard, PermissionsGuard)
  @RequirePermission('ticket.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async upload(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: SessionUser,
  ) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException();
    const canAccess = await this.rbac.canAccessTicket(user, ticket);
    if (!canAccess) throw new ForbiddenException();
    const attachment = await this.attachments.save(ticketId, file, user.id, false);
    return {
      ...attachment,
      downloadUrl: this.attachments.signDownloadUrl(attachment.id),
    };
  }

  @Get('attachments/:id/download')
  async download(
    @Param('id') id: string,
    @Query('expires') expires: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    if (!this.attachments.verifySignature(id, parseInt(expires, 10), sig)) {
      throw new ForbiddenException('Invalid or expired download link');
    }
    const result = await this.attachments.getFile(id);
    if (!result) throw new NotFoundException();
    res.setHeader('Content-Type', result.attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.attachment.filename}"`);
    res.send(result.buffer);
  }
}
