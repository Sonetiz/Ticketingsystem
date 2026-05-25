import { Controller, Get, UseGuards, Query } from '@nestjs/common';
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

  @Get('employees')
  @RequirePermission('ticket.read')
  listEmployees(@Query('q') q?: string, @Query('department') department?: string) {
    const where: {
      deletedAt: null;
      department?: string;
      OR?: Array<{ name?: object; email?: object; employeeNumber?: object }>;
    } = { deletedAt: null };
    if (department) where.department = department;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { employeeNumber: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        jobTitle: true,
        location: true,
        employeeNumber: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }
}
