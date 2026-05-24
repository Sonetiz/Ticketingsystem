import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
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

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('recurring.update')
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.recurring.remove(id, user);
  }

  @Post(':id/duplicate')
  @UseGuards(CsrfGuard)
  @RequirePermission('recurring.create')
  duplicate(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.recurring.duplicate(id, user);
  }

  @Post(':id/run-now')
  @UseGuards(CsrfGuard)
  @RequirePermission('recurring.update')
  runNow(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.recurring.runNow(id, user);
  }
}
