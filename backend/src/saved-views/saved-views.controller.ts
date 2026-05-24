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
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto/saved-view.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('saved-views')
@Controller('saved-views')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class SavedViewsController {
  constructor(private readonly savedViews: SavedViewsService) {}

  @Get()
  @RequirePermission('ticket.read')
  findAll(@CurrentUser() user: SessionUser) {
    return this.savedViews.findAll(user);
  }

  @Get(':id')
  @RequirePermission('ticket.read')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.savedViews.findOne(id, user);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.read')
  create(@Body() dto: CreateSavedViewDto, @CurrentUser() user: SessionUser) {
    return this.savedViews.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.read')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSavedViewDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.savedViews.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.read')
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.savedViews.remove(id, user);
  }
}
