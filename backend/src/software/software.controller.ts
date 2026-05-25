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
import { SoftwareService } from './software.service';
import { CreateSoftwareLicenseDto, UpdateSoftwareLicenseDto } from './dto/software.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('software')
@Controller('software')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class SoftwareController {
  constructor(private readonly software: SoftwareService) {}

  @Get()
  @RequirePermission('software.read')
  findAll() {
    return this.software.findAll();
  }

  @Get(':id')
  @RequirePermission('software.read')
  findOne(@Param('id') id: string) {
    return this.software.findOne(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('software.create')
  create(@Body() dto: CreateSoftwareLicenseDto) {
    return this.software.create(dto);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('software.update')
  update(@Param('id') id: string, @Body() dto: UpdateSoftwareLicenseDto) {
    return this.software.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('software.update')
  remove(@Param('id') id: string, @Query('force') force?: string) {
    return this.software.remove(id, force === 'true');
  }
}
