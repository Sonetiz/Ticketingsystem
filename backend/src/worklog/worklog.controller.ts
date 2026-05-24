import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorklogService } from './worklog.service';
import { CreateWorklogDto, UpdateWorklogDto } from './dto/worklog.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('worklog')
@Controller()
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class WorklogController {
  constructor(private readonly worklog: WorklogService) {}

  @Get('tickets/:ticketId/worklog')
  @RequirePermission('ticket.read')
  findByTicket(@Param('ticketId') ticketId: string, @CurrentUser() user: SessionUser) {
    return this.worklog.findByTicket(ticketId, user);
  }

  @Post('tickets/:ticketId/worklog')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  create(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateWorklogDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.worklog.create(ticketId, dto, user);
  }

  @Patch('worklog/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorklogDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.worklog.update(id, dto, user);
  }

  @Delete('worklog/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.worklog.remove(id, user);
  }
}
