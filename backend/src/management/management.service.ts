import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { SessionUser, ROLES } from '@ticketsystem/shared';

const PROTECTED_ROLE_SLUGS = new Set<string>([
  ROLES.SUPER_ADMIN,
  ROLES.SYSTEM_ADMIN,
  ROLES.AGENT,
  ROLES.REQUESTER,
]);

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
        authProvider: true,
        passwordLoginDisabled: true,
        jobTitle: true,
        department: true,
        location: true,
        phone: true,
        employeeNumber: true,
        managerId: true,
        manager: { select: { id: true, name: true, email: true } },
        createdAt: true,
        roles: { include: { role: true } },
        teamMemberships: { include: { team: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(data: {
    email: string;
    name: string;
    password?: string;
    roleIds?: string[];
    authProvider?: string;
    passwordLoginDisabled?: boolean;
    jobTitle?: string;
    department?: string;
    location?: string;
    phone?: string;
    employeeNumber?: string;
    managerId?: string;
  }) {
    const authProvider = data.authProvider || (data.password ? 'local' : 'entra');
    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        authProvider,
        passwordLoginDisabled: data.passwordLoginDisabled ?? authProvider !== 'local',
        jobTitle: data.jobTitle,
        department: data.department,
        location: data.location,
        phone: data.phone,
        employeeNumber: data.employeeNumber,
        managerId: data.managerId,
        roles: data.roleIds?.length
          ? { create: data.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
    });
    return user;
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      isActive?: boolean;
      roleIds?: string[];
      authProvider?: string;
      passwordLoginDisabled?: boolean;
      jobTitle?: string;
      department?: string;
      location?: string;
      phone?: string;
      employeeNumber?: string;
      managerId?: string | null;
    },
    actor: SessionUser,
  ) {
    if (data.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: data.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        isActive: data.isActive,
        authProvider: data.authProvider,
        passwordLoginDisabled: data.passwordLoginDisabled,
        jobTitle: data.jobTitle,
        department: data.department,
        location: data.location,
        phone: data.phone,
        employeeNumber: data.employeeNumber,
        managerId: data.managerId === null ? null : data.managerId,
      },
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

  async deleteUser(id: string, actor: SessionUser) {
    if (id === actor.id) throw new BadRequestException('Cannot delete your own account');

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    const isSuperAdmin = user.roles.some((r) => r.role.slug === ROLES.SUPER_ADMIN);
    if (isSuperAdmin) {
      const remaining = await this.prisma.userRole.count({
        where: {
          role: { slug: ROLES.SUPER_ADMIN },
          user: { deletedAt: null, id: { not: id } },
        },
      });
      if (remaining === 0) {
        throw new BadRequestException('Cannot delete the last super admin');
      }
    }

    const timestamp = Date.now();
    const deletedEmail = `deleted-${timestamp}-${user.email}`;

    await this.prisma.$transaction([
      this.prisma.ticket.updateMany({
        where: { assigneeId: id, deletedAt: null },
        data: { assigneeId: null },
      }),
      this.prisma.ticket.updateMany({
        where: { holdById: id, deletedAt: null },
        data: { holdById: null },
      }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
      this.prisma.apiToken.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          email: deletedEmail,
        },
      }),
    ]);

    await this.audit.log({
      actorId: actor.id,
      entityType: 'user',
      entityId: id,
      action: 'deleted',
      newValue: { deletedEmail },
    });

    return { success: true };
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

  async createRole(data: { slug: string; name: string; description?: string }) {
    return this.prisma.role.create({ data });
  }

  async updateRole(id: string, data: { name?: string; description?: string }, actor: SessionUser) {
    const role = await this.prisma.role.update({ where: { id }, data });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'role',
      entityId: id,
      action: 'updated',
      newValue: data,
    });
    return role;
  }

  async deleteRole(id: string, actor: SessionUser) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (PROTECTED_ROLE_SLUGS.has(role.slug)) {
      throw new BadRequestException('Cannot delete built-in role');
    }
    const userCount = await this.prisma.userRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      throw new ConflictException('Role is assigned to users');
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'role',
      entityId: id,
      action: 'deleted',
    });
    return { success: true };
  }

  async setRolePermissions(roleId: string, permissionIds: string[], actor: SessionUser) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }
    await this.audit.log({
      actorId: actor.id,
      entityType: 'role',
      entityId: roleId,
      action: 'permissions_updated',
      newValue: { permissionIds },
    });
    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
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

  async updateTeam(
    id: string,
    data: { slug?: string; name?: string; description?: string; isDefault?: boolean },
    actor: SessionUser,
  ) {
    const team = await this.prisma.team.update({ where: { id }, data });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'team',
      entityId: id,
      action: 'updated',
      newValue: data,
    });
    return team;
  }

  async addTeamMember(teamId: string, userId: string, isLead = false) {
    return this.prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, isLead },
      update: { isLead },
    });
  }

  async removeTeamMember(teamId: string, userId: string, actor: SessionUser) {
    await this.prisma.teamMembership.delete({
      where: { teamId_userId: { teamId, userId } },
    });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'team',
      entityId: teamId,
      action: 'member_removed',
      newValue: { userId },
    });
    return { success: true };
  }

  // Status & Priority config
  async listStatuses() {
    return this.prisma.statusDefinition.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertStatus(data: {
    slug: string;
    name: string;
    sortOrder?: number;
    isClosed?: boolean;
    isHold?: boolean;
    isActive?: boolean;
    color?: string;
  }) {
    return this.prisma.statusDefinition.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });
  }

  async deleteStatus(slug: string) {
    const ticketCount = await this.prisma.ticket.count({ where: { status: slug } });
    if (ticketCount > 0) {
      throw new ConflictException('Status is in use by tickets');
    }
    await this.prisma.statusDefinition.delete({ where: { slug } });
    return { success: true };
  }

  async listPriorities() {
    return this.prisma.priorityDefinition.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertPriority(data: {
    slug: string;
    name: string;
    sortOrder?: number;
    color?: string;
  }) {
    return this.prisma.priorityDefinition.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });
  }

  async deletePriority(slug: string) {
    const ticketCount = await this.prisma.ticket.count({ where: { priority: slug } });
    if (ticketCount > 0) {
      throw new ConflictException('Priority is in use by tickets');
    }
    await this.prisma.priorityDefinition.delete({ where: { slug } });
    return { success: true };
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
    isActive?: boolean;
  }) {
    return this.prisma.slaRule.create({ data });
  }

  async updateSlaRule(
    id: string,
    data: {
      name?: string;
      priority?: string;
      categoryId?: string | null;
      serviceId?: string | null;
      responseMinutes?: number;
      resolutionMinutes?: number;
      escalationThresholds?: object;
      isActive?: boolean;
    },
    actor: SessionUser,
  ) {
    const rule = await this.prisma.slaRule.update({ where: { id }, data });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'sla_rule',
      entityId: id,
      action: 'updated',
      newValue: data,
    });
    return rule;
  }

  async deleteSlaRule(id: string, actor: SessionUser) {
    await this.prisma.slaRule.delete({ where: { id } });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'sla_rule',
      entityId: id,
      action: 'deleted',
    });
    return { success: true };
  }

  // Integration settings
  async getIntegrationSettings() {
    return this.prisma.integrationSetting.findMany();
  }

  async upsertIntegrationSetting(connector: string, body: { config?: object; isActive?: boolean }) {
    const existing = await this.prisma.integrationSetting.findUnique({ where: { connector } });
    const config = body.config ?? (existing?.config as object) ?? {};
    const isActive = body.isActive ?? existing?.isActive ?? true;
    return this.prisma.integrationSetting.upsert({
      where: { connector },
      create: { connector, config, isActive },
      update: { config, isActive },
    });
  }

  // Templates
  async createProjectTemplate(data: {
    name: string;
    description?: string;
    tickets?: Array<{ title: string; description?: string; priority?: string; sortOrder?: number }>;
  }) {
    return this.prisma.projectTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        tickets: data.tickets?.length
          ? { create: data.tickets.map((t, i) => ({ ...t, sortOrder: t.sortOrder ?? i })) }
          : undefined,
      },
      include: { tickets: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateProjectTemplate(
    id: string,
    data: {
      name?: string;
      description?: string;
      tickets?: Array<{ title: string; description?: string; priority?: string; sortOrder?: number }>;
    },
  ) {
    if (data.tickets) {
      await this.prisma.projectTemplateTicket.deleteMany({ where: { templateId: id } });
    }
    return this.prisma.projectTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        tickets: data.tickets
          ? { create: data.tickets.map((t, i) => ({ ...t, sortOrder: t.sortOrder ?? i })) }
          : undefined,
      },
      include: { tickets: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteProjectTemplate(id: string) {
    await this.prisma.projectTemplate.delete({ where: { id } });
    return { success: true };
  }

  async createNotificationTemplate(data: {
    slug: string;
    name: string;
    subject?: string;
    body: string;
    channel: string;
  }) {
    return this.prisma.notificationTemplate.create({ data });
  }

  async updateNotificationTemplate(
    id: string,
    data: { slug?: string; name?: string; subject?: string; body?: string; channel?: string },
  ) {
    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  async deleteNotificationTemplate(id: string) {
    await this.prisma.notificationTemplate.delete({ where: { id } });
    return { success: true };
  }

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
    const token = await this.auth.createApiToken(userId, name, permissions);
    return { token };
  }

  async listApiTokens() {
    return this.prisma.apiToken.findMany({
      select: { id: true, name: true, userId: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    });
  }

  async revokeApiToken(id: string, actor: SessionUser) {
    await this.prisma.apiToken.delete({ where: { id } });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'api_token',
      entityId: id,
      action: 'revoked',
    });
    return { success: true };
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

  async deleteSystemSetting(key: string, actor: SessionUser) {
    await this.prisma.systemSetting.delete({ where: { key } });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'system_setting',
      entityId: key,
      action: 'deleted',
    });
    return { success: true };
  }
}
