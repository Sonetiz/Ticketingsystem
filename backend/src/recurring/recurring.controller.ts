import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecurringService } from './recurring.service';
import { CreateRecurringTaskDto } from './dto/recurring.dto';
import { SessionAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('recurring')
@Controller('recurring-tasks')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class RecurringController {
  constructor(private readonly recurring: RecurringService) {}

  @Get()
  @RequirePermission('recurring.read')
  findAll() {
    return this.recurring.findAll();
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('recurring.create')
  create(@Body() dto: CreateRecurringTaskDto, @CurrentUser() user: SessionUser) {
    return this.recurring.create(dto, user);
  }

  @Patch(':id/toggle')
  @UseGuards(CsrfGuard)
  @RequirePermission('recurring.update')
  toggle(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.recurring.toggleActive(id, isActive);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('recurring.update')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRecurringTaskDto>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.recurring.update(id, dto, user);
  }
}
