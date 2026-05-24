import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/project.dto';
import { SessionAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('projects')
@Controller('projects')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermission('project.read')
  findAll() {
    return this.projects.findAll();
  }

  @Get(':id')
  @RequirePermission('project.read')
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('project.create')
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: SessionUser) {
    return this.projects.create(dto, user);
  }

  @Post(':id/bulk-from-template/:templateId')
  @UseGuards(CsrfGuard)
  @RequirePermission('project.update')
  bulkCreate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.projects.bulkCreateTickets(id, templateId, user);
  }
}
