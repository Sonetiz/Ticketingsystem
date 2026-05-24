import { RbacService } from './rbac.service';
import { SessionUser } from '@ticketsystem/shared';

describe('RbacService', () => {
  let rbac: RbacService;

  beforeEach(() => {
    rbac = new RbacService({} as never);
  });

  const makeUser = (permissions: string[], roles: string[] = []): SessionUser => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    roles: roles as SessionUser['roles'],
    permissions,
    teamIds: ['team-1'],
  });

  describe('hasPermission', () => {
    it('grants exact permission match', () => {
      const user = makeUser(['ticket.read']);
      expect(rbac.hasPermission(user, 'ticket.read')).toBe(true);
    });

    it('grants wildcard permission', () => {
      const user = makeUser(['*']);
      expect(rbac.hasPermission(user, 'anything.here')).toBe(true);
    });

    it('grants resource wildcard', () => {
      const user = makeUser(['ticket.*']);
      expect(rbac.hasPermission(user, 'ticket.update')).toBe(true);
    });

    it('denies missing permission', () => {
      const user = makeUser(['ticket.read']);
      expect(rbac.hasPermission(user, 'ticket.update')).toBe(false);
    });
  });

  describe('canManage', () => {
    it('allows manage.* permission', () => {
      expect(rbac.canManage(makeUser(['manage.*']))).toBe(true);
    });

    it('allows super_admin role', () => {
      expect(rbac.canManage(makeUser([], ['super_admin']))).toBe(true);
    });

    it('denies agent role', () => {
      expect(rbac.canManage(makeUser(['ticket.read'], ['agent']))).toBe(false);
    });
  });

  describe('canAccessTicket', () => {
    it('allows assignee access', async () => {
      const user = makeUser(['ticket.read']);
      const result = await rbac.canAccessTicket(user, {
        assigneeId: 'user-1',
        assignedTeamId: null,
        requesterId: null,
      });
      expect(result).toBe(true);
    });

    it('denies generic ticket.read without relationship', async () => {
      const user = makeUser(['ticket.read']);
      const result = await rbac.canAccessTicket(user, {
        assigneeId: 'other-user',
        assignedTeamId: 'other-team',
        requesterId: 'another-user',
      });
      expect(result).toBe(false);
    });

    it('allows team member access', async () => {
      const user = makeUser(['ticket.read']);
      const result = await rbac.canAccessTicket(user, {
        assigneeId: null,
        assignedTeamId: 'team-1',
        requesterId: null,
      });
      expect(result).toBe(true);
    });

    it('allows read.all permission', async () => {
      const user = makeUser(['ticket.read.all']);
      const result = await rbac.canAccessTicket(user, {
        assigneeId: 'other',
        assignedTeamId: 'other-team',
        requesterId: null,
      });
      expect(result).toBe(true);
    });
  });
});
