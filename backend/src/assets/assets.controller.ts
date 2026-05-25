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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { AssetsImportService } from './assets-import.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AddAssetRelationshipDto,
  InstallSoftwareDto,
} from './dto/asset.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('assets')
@Controller('assets')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    private readonly importService: AssetsImportService,
  ) {}

  @Get()
  @RequirePermission('asset.read')
  findAll(
    @Query('assetType') assetType?: string,
    @Query('serviceId') serviceId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('primaryUserId') primaryUserId?: string,
    @Query('status') status?: string,
    @Query('lifecycleStage') lifecycleStage?: string,
    @Query('q') q?: string,
  ) {
    return this.assets.findAll({
      assetType,
      serviceId,
      ownerId,
      primaryUserId,
      status,
      lifecycleStage,
      q,
    });
  }

  @Post('import')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun?: string,
  ) {
    if (!file) throw new BadRequestException('CSV file is required');
    const content = file.buffer.toString('utf-8');
    return this.importService.importCsv(content, dryRun === 'true');
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
  @RequirePermission('asset.update')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.delete')
  remove(@Param('id') id: string) {
    return this.assets.remove(id);
  }

  @Post(':id/relationships')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.update')
  addRelationship(@Param('id') id: string, @Body() dto: AddAssetRelationshipDto) {
    return this.assets.addRelationship(id, dto);
  }

  @Delete(':id/relationships/:relId')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.update')
  removeRelationship(@Param('id') id: string, @Param('relId') relId: string) {
    return this.assets.removeRelationship(id, relId);
  }

  @Post(':id/software')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.update')
  installSoftware(@Param('id') id: string, @Body() dto: InstallSoftwareDto) {
    return this.assets.installSoftware(id, dto);
  }

  @Delete(':id/software/:licenseId')
  @UseGuards(CsrfGuard)
  @RequirePermission('asset.update')
  uninstallSoftware(@Param('id') id: string, @Param('licenseId') licenseId: string) {
    return this.assets.uninstallSoftware(id, licenseId);
  }
}
