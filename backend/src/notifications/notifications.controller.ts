import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SessionAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser, @Query('unread') unread?: string) {
    return this.notifications.getUserNotifications(user.id, unread === 'true');
  }

  @Post(':id/read')
  @UseGuards(CsrfGuard)
  markRead(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.notifications.markRead(id, user.id);
  }
}
