import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChangesService } from './changes.service';
import { AssetsService } from '../assets/assets.service';
import {
  CreateChangeRequestDto,
  UpdateChangeRequestDto,
  CreateFreezeWindowDto,
  UpdateFreezeWindowDto,
} from './dto/change.dto';
import { LinkTicketAssetDto } from '../assets/dto/asset.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('changes')
@Controller('changes')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class ChangesController {
  constructor(
    private readonly changes: ChangesService,
    private readonly assets: AssetsService,
  ) {}

  @Get('calendar')
  @RequirePermission('ticket.read')
  calendar(@Query('from') from?: string, @Query('to') to?: string) {
    return this.changes.getCalendar(from, to);
  }

  @Get('freeze-windows')
  @RequirePermission('ticket.read')
  listFreezeWindows() {
    return this.changes.findAllFreezeWindows();
  }

  @Post('freeze-windows')
  @UseGuards(CsrfGuard)
  @RequirePermission('manage.settings')
  createFreezeWindow(@Body() dto: CreateFreezeWindowDto) {
    return this.changes.createFreezeWindow(dto);
  }

  @Patch('freeze-windows/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('manage.settings')
  updateFreezeWindow(@Param('id') id: string, @Body() dto: UpdateFreezeWindowDto) {
    return this.changes.updateFreezeWindow(id, dto);
  }

  @Delete('freeze-windows/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('manage.settings')
  removeFreezeWindow(@Param('id') id: string) {
    return this.changes.removeFreezeWindow(id);
  }

  @Get()
  @RequirePermission('ticket.read')
  findAll(@Query('status') status?: string) {
    return this.changes.findAllChanges(status);
  }

  @Get(':id')
  @RequirePermission('ticket.read')
  findOne(@Param('id') id: string) {
    return this.changes.findChange(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  create(@Body() dto: CreateChangeRequestDto) {
    return this.changes.createChange(dto);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  update(@Param('id') id: string, @Body() dto: UpdateChangeRequestDto) {
    return this.changes.updateChange(id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  remove(@Param('id') id: string) {
    return this.changes.removeChange(id);
  }

  @Get(':id/assets')
  @RequirePermission('ticket.read')
  getAssets(@Param('id') id: string) {
    return this.assets.getChangeAssets(id);
  }

  @Post(':id/assets')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  linkAsset(@Param('id') id: string, @Body() dto: LinkTicketAssetDto) {
    return this.assets.linkChangeAsset(id, dto.assetId, dto.relation);
  }

  @Delete(':id/assets/:assetId')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  unlinkAsset(@Param('id') id: string, @Param('assetId') assetId: string) {
    return this.assets.unlinkChangeAsset(id, assetId);
  }
}
