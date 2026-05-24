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
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('assets')
@Controller('assets')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @RequirePermission('asset.read')
  findAll(@Query('assetType') assetType?: string, @Query('serviceId') serviceId?: string) {
    return this.assets.findAll({ assetType, serviceId });
  }

  @Get(':id')
  @RequirePermission('asset.read')
  findOne(@Param('id') id: string) {
    return this.assets.findOne(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.create')
  create(@Body() dto: CreateAssetDto) {
    return this.assets.create(dto);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.create')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.create')
  remove(@Param('id') id: string) {
    return this.assets.remove(id);
  }
}
