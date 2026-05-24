import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionUser } from '@ticketsystem/shared';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
    const perms = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        perms.add(rp.permission.slug);
      }
    }
    return Array.from(perms);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.slug);
  }

  async getUserTeamIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.teamMembership.findMany({
      where: { userId },
      select: { teamId: true },
    });
    return memberships.map((m) => m.teamId);
  }

  async buildSessionUser(userId: string): Promise<SessionUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, deletedAt: null },
    });
    if (!user) return null;
    const [roles, permissions, teamIds] = await Promise.all([
      this.getUserRoles(userId),
      this.getUserPermissions(userId),
      this.getUserTeamIds(userId),
    ]);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: roles as SessionUser['roles'],
      permissions,
      teamIds,
    };
  }

  hasPermission(user: SessionUser, permission: string): boolean {
    if (user.permissions.includes('*') || user.permissions.includes(permission)) {
      return true;
    }
    const [resource] = permission.split('.');
    return user.permissions.includes(`${resource}.*`);
  }

  hasAnyRole(user: SessionUser, roles: string[]): boolean {
    return roles.some((r) => user.roles.includes(r as SessionUser['roles'][number]));
  }

  canManage(user: SessionUser): boolean {
    return this.hasPermission(user, 'manage.*') || this.hasAnyRole(user, ['super_admin', 'system_admin']);
  }

  async canAccessTicket(user: SessionUser, ticket: {
    assigneeId: string | null;
    assignedTeamId: string | null;
    requesterId: string | null;
  }): Promise<boolean> {
    if (this.hasPermission(user, 'ticket.read.all')) return true;
    if (ticket.assigneeId === user.id) return true;
    if (ticket.requesterId === user.id) return true;
    if (ticket.assignedTeamId && user.teamIds.includes(ticket.assignedTeamId)) return true;
    if (this.hasPermission(user, 'ticket.read')) return true;
    return false;
  }
}
