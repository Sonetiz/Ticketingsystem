import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('lookups')
@Controller('lookups')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class LookupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('teams')
  @RequirePermission('ticket.read')
  listTeams() {
    return this.prisma.team.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('agents')
  @RequirePermission('ticket.read')
  listAgents() {
    return this.prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
}
