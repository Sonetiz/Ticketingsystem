import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SessionAuthGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { ProjectsService } from '../projects/projects.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly projects: ProjectsService,
  ) {}

  @Get('open-by-team')
  @RequirePermission('report.read')
  openByTeam() {
    return this.reports.openByTeam();
  }

  @Get('period-stats')
  @RequirePermission('report.read')
  periodStats(@Query('from') from?: string, @Query('to') to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    return this.reports.periodStats(fromDate, toDate);
  }

  @Get('sla-breaches')
  @RequirePermission('report.read')
  slaBreaches(@Query('from') from?: string) {
    return this.reports.slaBreaches(from ? new Date(from) : undefined);
  }

  @Get('workload-by-agent')
  @RequirePermission('report.read')
  workloadByAgent() {
    return this.reports.workloadByAgent();
  }

  @Get('by-category')
  @RequirePermission('report.read')
  byCategory() {
    return this.reports.ticketsByCategory();
  }

  @Get('project-progress')
  @RequirePermission('report.read')
  async projectProgress() {
    const projects = await this.projects.findAll();
    return projects.map((p) => {
      const project = p as { id: string; name: string; progress: object };
      return { id: project.id, name: project.name, ...project.progress };
    });
  }
}
