import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { SessionAuthGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('sla')
@Controller('sla')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class SlaController {
  constructor(
    private readonly sla: SlaService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('rules')
  @RequirePermission('manage.sla')
  async listRules() {
    return this.prisma.slaRule.findMany({ where: { isActive: true } });
  }
}
