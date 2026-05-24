import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { SessionUser } from '@ticketsystem/shared';

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  // Users
  async listUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        roles: { include: { role: true } },
        teamMemberships: { include: { team: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(data: { email: string; name: string; password: string; roleIds?: string[] }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        roles: data.roleIds?.length
          ? { create: data.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
    });
    return user;
  }

  async updateUser(id: string, data: { name?: string; isActive?: boolean; roleIds?: string[] }, actor: SessionUser) {
    if (data.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: data.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { name: data.name, isActive: data.isActive },
    });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'user',
      entityId: id,
      action: 'updated',
      newValue: data,
    });
    return user;
  }

  // Roles & Permissions
  async listRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { slug: 'asc' } });
  }

  // Teams
  async listTeams() {
    return this.prisma.team.findMany({
      where: { deletedAt: null },
      include: {
        memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { assignedTickets: true } },
      },
    });
  }

  async createTeam(data: { slug: string; name: string; description?: string }) {
    return this.prisma.team.create({ data });
  }

  async addTeamMember(teamId: string, userId: string, isLead = false) {
    return this.prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, isLead },
      update: { isLead },
    });
  }

  // Status & Priority config
  async listStatuses() {
    return this.prisma.statusDefinition.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertStatus(data: { slug: string; name: string; sortOrder?: number; isClosed?: boolean; isHold?: boolean; color?: string }) {
    return this.prisma.statusDefinition.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });
  }

  async listPriorities() {
    return this.prisma.priorityDefinition.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  // SLA Rules
  async listSlaRules() {
    return this.prisma.slaRule.findMany({
      include: { category: true, service: true },
    });
  }

  async createSlaRule(data: {
    name: string;
    priority?: string;
    categoryId?: string;
    serviceId?: string;
    responseMinutes?: number;
    resolutionMinutes?: number;
    escalationThresholds?: object;
  }) {
    return this.prisma.slaRule.create({ data });
  }

  // Integration settings
  async getIntegrationSettings() {
    return this.prisma.integrationSetting.findMany();
  }

  async upsertIntegrationSetting(connector: string, config: object) {
    return this.prisma.integrationSetting.upsert({
      where: { connector },
      create: { connector, config },
      update: { config },
    });
  }

  // Templates
  async listProjectTemplates() {
    return this.prisma.projectTemplate.findMany({
      include: { tickets: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async listNotificationTemplates() {
    return this.prisma.notificationTemplate.findMany();
  }

  // Audit log
  async getAuditLogs(page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // API tokens
  async createApiToken(userId: string, name: string, permissions: string[], actor: SessionUser) {
    return this.auth.createApiToken(userId, name, permissions);
  }

  async listApiTokens() {
    return this.prisma.apiToken.findMany({
      select: { id: true, name: true, userId: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    });
  }

  // System settings
  async getSystemSettings() {
    return this.prisma.systemSetting.findMany();
  }

  async upsertSystemSetting(key: string, value: object) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
