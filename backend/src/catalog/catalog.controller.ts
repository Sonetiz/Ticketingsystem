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
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto, RequestCatalogItemDto } from './dto/catalog.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('catalog')
@Controller('catalog')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @RequirePermission('ticket.read')
  findAll(@Query('all') all?: string) {
    return this.catalog.findAll(all !== 'true');
  }

  @Get(':id')
  @RequirePermission('ticket.read')
  findOne(@Param('id') id: string) {
    return this.catalog.findOne(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('manage.settings')
  create(@Body() dto: CreateCatalogItemDto) {
    return this.catalog.create(dto);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('manage.settings')
  update(@Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.catalog.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('manage.settings')
  remove(@Param('id') id: string) {
    return this.catalog.remove(id);
  }

  @Post(':id/request')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.create')
  request(
    @Param('id') id: string,
    @Body() dto: RequestCatalogItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.catalog.requestService(id, dto, user);
  }
}
