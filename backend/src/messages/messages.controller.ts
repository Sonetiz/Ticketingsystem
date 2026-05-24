import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto, SendEmailDto } from './dto/message.dto';
import { SessionAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('messages')
@Controller('tickets/:ticketId/messages')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @RequirePermission('ticket.read')
  timeline(@Param('ticketId') ticketId: string, @CurrentUser() user: SessionUser) {
    return this.messages.getTimeline(ticketId, user);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  create(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.messages.create(ticketId, dto, user);
  }

  @Post('email')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.email')
  sendEmail(
    @Param('ticketId') ticketId: string,
    @Body() dto: SendEmailDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.messages.logOutboundEmail(ticketId, dto, user);
  }
}
