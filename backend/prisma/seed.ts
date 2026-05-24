import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ROLES, DEFAULT_STATUSES, DEFAULT_PRIORITIES } from '@ticketsystem/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Permissions
  const permissionSlugs = [
    '*',
    'ticket.read',
    'ticket.read.all',
    'ticket.create',
    'ticket.update',
    'ticket.assign',
    'ticket.email',
    'project.read',
    'project.create',
    'project.update',
    'recurring.read',
    'recurring.create',
    'recurring.update',
    'report.read',
    'manage.*',
    'manage.users',
    'manage.roles',
    'manage.teams',
    'manage.statuses',
    'manage.sla',
    'manage.integrations',
    'manage.settings',
    'kb.read',
    'kb.create',
    'asset.read',
  ];

  const permissions = await Promise.all(
    permissionSlugs.map((slug) =>
      prisma.permission.upsert({
        where: { slug },
        create: { slug, name: slug.replace(/\./g, ' ').replace(/\*/g, 'all') },
        update: {},
      }),
    ),
  );
  const permMap = Object.fromEntries(permissions.map((p) => [p.slug, p.id]));

  // Roles
  const roleDefs = [
    { slug: ROLES.SUPER_ADMIN, name: 'Super Admin', perms: ['*'] },
    { slug: ROLES.SYSTEM_ADMIN, name: 'System Admin', perms: ['manage.*', 'ticket.read.all', 'ticket.create', 'ticket.update', 'ticket.assign', 'ticket.email', 'project.read', 'project.create', 'project.update', 'recurring.read', 'recurring.create', 'recurring.update', 'report.read'] },
    { slug: ROLES.SUPPORT_ADMIN, name: 'Support Admin', perms: ['ticket.read.all', 'ticket.create', 'ticket.update', 'ticket.assign', 'ticket.email', 'project.read', 'project.create', 'recurring.read', 'recurring.create', 'report.read'] },
    { slug: ROLES.TEAM_LEAD, name: 'Team Lead', perms: ['ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign', 'ticket.email', 'project.read', 'recurring.read', 'report.read'] },
    { slug: ROLES.AGENT, name: 'Agent', perms: ['ticket.read', 'ticket.create', 'ticket.update', 'ticket.email', 'project.read'] },
    { slug: ROLES.AUDITOR, name: 'Auditor', perms: ['ticket.read.all', 'report.read'] },
    { slug: ROLES.REQUESTER, name: 'Requester', perms: ['ticket.create'] },
  ];

  for (const rd of roleDefs) {
    const role = await prisma.role.upsert({
      where: { slug: rd.slug },
      create: { slug: rd.slug, name: rd.name },
      update: { name: rd.name },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const p of rd.perms) {
      if (permMap[p]) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permMap[p] },
        });
      }
    }
  }

  const superAdminRole = await prisma.role.findUnique({ where: { slug: ROLES.SUPER_ADMIN } });
  const agentRole = await prisma.role.findUnique({ where: { slug: ROLES.AGENT } });
  const requesterRole = await prisma.role.findUnique({ where: { slug: ROLES.REQUESTER } });

  const passwordHash = await bcrypt.hash('password123', 12);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketsystem.local' },
    create: {
      email: 'admin@ticketsystem.local',
      name: 'System Admin',
      passwordHash,
      roles: superAdminRole ? { create: [{ roleId: superAdminRole.id }] } : undefined,
    },
    update: {},
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@ticketsystem.local' },
    create: {
      email: 'agent@ticketsystem.local',
      name: 'Support Agent',
      passwordHash,
      roles: agentRole ? { create: [{ roleId: agentRole.id }] } : undefined,
    },
    update: {},
  });

  const requester = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    create: {
      email: 'user@example.com',
      name: 'Jane Requester',
      passwordHash,
      roles: requesterRole ? { create: [{ roleId: requesterRole.id }] } : undefined,
    },
    update: {},
  });

  // Teams
  const teams = [
    { slug: 'hotline', name: 'Hotline / First Level Support', isDefault: true },
    { slug: 'security', name: 'Security Team', isDefault: false },
    { slug: 'infrastructure', name: 'Infrastructure Team', isDefault: false },
    { slug: 'network', name: 'Network Team', isDefault: false },
    { slug: 'application', name: 'Application Team', isDefault: false },
  ];

  const teamRecords: Record<string, string> = {};
  for (const t of teams) {
    const team = await prisma.team.upsert({
      where: { slug: t.slug },
      create: t,
      update: { name: t.name },
    });
    teamRecords[t.slug] = team.id;
  }

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: teamRecords.hotline, userId: agent.id } },
    create: { teamId: teamRecords.hotline, userId: agent.id, isLead: true },
    update: {},
  });

  // Statuses
  const statusDefs = [
    { slug: 'new', name: 'New', sortOrder: 0, isClosed: false, isHold: false, color: '#6366f1' },
    { slug: 'open', name: 'Open', sortOrder: 1, isClosed: false, isHold: false, color: '#3b82f6' },
    { slug: 'in_progress', name: 'In Progress', sortOrder: 2, isClosed: false, isHold: false, color: '#8b5cf6' },
    { slug: 'waiting_for_user', name: 'Waiting for User', sortOrder: 3, isClosed: false, isHold: true, color: '#f59e0b' },
    { slug: 'waiting_for_vendor', name: 'Waiting for Vendor', sortOrder: 4, isClosed: false, isHold: true, color: '#f97316' },
    { slug: 'waiting_for_internal_team', name: 'Waiting for Internal Team', sortOrder: 5, isClosed: false, isHold: true, color: '#eab308' },
    { slug: 'on_hold', name: 'On Hold', sortOrder: 6, isClosed: false, isHold: true, color: '#64748b' },
    { slug: 'resolved', name: 'Resolved', sortOrder: 7, isClosed: false, color: '#22c55e' },
    { slug: 'closed', name: 'Closed', sortOrder: 8, isClosed: true, color: '#6b7280' },
    { slug: 'cancelled', name: 'Cancelled', sortOrder: 9, isClosed: true, color: '#ef4444' },
  ];

  for (const s of statusDefs) {
    await prisma.statusDefinition.upsert({
      where: { slug: s.slug },
      create: s,
      update: s,
    });
  }

  // Priorities
  const priorityDefs = [
    { slug: 'normal', name: 'Normal', sortOrder: 0, color: '#6b7280' },
    { slug: 'elevated', name: 'Elevated', sortOrder: 1, color: '#3b82f6' },
    { slug: 'high', name: 'High', sortOrder: 2, color: '#f59e0b' },
    { slug: 'urgent', name: 'Urgent', sortOrder: 3, color: '#f97316' },
    { slug: 'critical', name: 'Critical', sortOrder: 4, color: '#ef4444' },
  ];

  for (const p of priorityDefs) {
    await prisma.priorityDefinition.upsert({
      where: { slug: p.slug },
      create: p,
      update: p,
    });
  }

  // Categories & Services
  const category = await prisma.category.upsert({
    where: { slug: 'general' },
    create: { slug: 'general', name: 'General Support' },
    update: {},
  });

  const service = await prisma.service.upsert({
    where: { slug: 'email' },
    create: { slug: 'email', name: 'Email Service' },
    update: {},
  });

  // SLA Rules
  await prisma.slaRule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default SLA',
      resolutionMinutes: 4320,
      responseMinutes: 480,
      escalationThresholds: {
        normalDays: 5,
        elevatedDays: 2,
        highHours: 48,
        urgentHours: 24,
      },
    },
    update: {},
  });

  // Project
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'VM Migration Project',
      description: 'Move VMs to a different virtualization platform',
      ownerId: admin.id,
      dueAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: agent.id } },
    create: { projectId: project.id, userId: agent.id, role: 'member' },
    update: {},
  });

  // Project template
  const projectTemplate = await prisma.projectTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'VM Migration Template',
      description: 'Standard tasks for VM migration',
    },
    update: {},
  });

  const templateTickets = [
    'Migrate VM-001',
    'Migrate VM-002',
    'Validate backups',
    'Update monitoring',
    'Notify stakeholders',
  ];
  await prisma.projectTemplateTicket.deleteMany({ where: { templateId: projectTemplate.id } });
  for (let i = 0; i < templateTickets.length; i++) {
    await prisma.projectTemplateTicket.create({
      data: {
        templateId: projectTemplate.id,
        title: templateTickets[i],
        sortOrder: i,
        priority: 'normal',
      },
    });
  }

  // Recurring tasks
  await prisma.recurringTaskTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Certificate Renewal Check',
      titleTemplate: 'Review SSL certificate expiry',
      descriptionTemplate: 'Check all production SSL certificates and renew if expiring within 30 days.',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      assignedTeamId: teamRecords.infrastructure,
      priority: 'elevated',
      dueDateOffsetHours: 48,
      isActive: true,
    },
    update: {},
  });

  await prisma.recurringTaskTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'Backup Verification',
      titleTemplate: 'Weekly backup verification',
      descriptionTemplate: 'Verify backup jobs completed successfully and test restore sample.',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      assignedTeamId: teamRecords.infrastructure,
      priority: 'normal',
      dueDateOffsetHours: 24,
      isActive: true,
    },
    update: {},
  });

  // Sample tickets
  const dueSoon = new Date(Date.now() + 36 * 60 * 60 * 1000);
  const overdue = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const ticket1 = await prisma.ticket.upsert({
    where: { number: 1 },
    create: {
      number: 1,
      title: 'Cannot access corporate email',
      description: 'User reports Outlook keeps asking for password after password reset.',
      status: 'open',
      priority: 'high',
      requesterId: requester.id,
      affectedUserId: requester.id,
      assigneeId: agent.id,
      assignedTeamId: teamRecords.hotline,
      categoryId: category.id,
      serviceId: service.id,
      dueAt: dueSoon,
      slaTargetAt: dueSoon,
      source: 'web',
    },
    update: {},
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      authorId: requester.id,
      kind: 'public_reply',
      body: 'This started happening after I changed my password yesterday.',
      isPublic: true,
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      authorId: agent.id,
      kind: 'internal_note',
      body: 'Checked AD sync - password hash may not have propagated. @admin please verify.',
      isPublic: false,
    },
  });

  await prisma.ticket.upsert({
    where: { number: 2 },
    create: {
      number: 2,
      title: 'Firewall rule change request',
      description: 'Need to allow HTTPS from vendor IP range 203.0.113.0/24 to internal API.',
      status: 'waiting_for_vendor',
      priority: 'urgent',
      requesterId: requester.id,
      assignedTeamId: teamRecords.security,
      holdUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      holdReason: 'waiting_for_vendor',
      dueAt: overdue,
      slaTargetAt: overdue,
      source: 'email',
    },
    update: {},
  });

  await prisma.ticket.upsert({
    where: { number: 3 },
    create: {
      number: 3,
      title: 'Migrate VM-001',
      description: 'Migrate VM-001 to new hypervisor cluster per project plan.',
      status: 'in_progress',
      priority: 'normal',
      assigneeId: agent.id,
      assignedTeamId: teamRecords.infrastructure,
      projectId: project.id,
      source: 'admin',
    },
    update: {},
  });

  // Integration settings
  await prisma.integrationSetting.upsert({
    where: { connector: 'email' },
    create: {
      connector: 'email',
      config: { type: 'mock', smtpHost: 'localhost', smtpPort: 1025 },
      isActive: true,
    },
    update: {},
  });

  await prisma.integrationSetting.upsert({
    where: { connector: 'teams' },
    create: {
      connector: 'teams',
      config: { type: 'mock' },
      isActive: true,
    },
    update: {},
  });

  // Notification templates
  await prisma.notificationTemplate.upsert({
    where: { slug: 'ticket_assigned' },
    create: {
      slug: 'ticket_assigned',
      name: 'Ticket Assigned',
      subject: 'Ticket #{{number}} assigned to you',
      body: 'You have been assigned ticket #{{number}}: {{title}}',
      channel: 'email',
    },
    update: {},
  });

  // Canned response
  await prisma.cannedResponse.upsert({
    where: { slug: 'password-reset-instructions' },
    create: {
      slug: 'password-reset-instructions',
      name: 'Password Reset Instructions',
      body: 'Please visit the self-service portal to reset your password. If issues persist, reply to this ticket.',
    },
    update: {},
  });

  // Knowledge base stub
  await prisma.knowledgeArticle.upsert({
    where: { slug: 'outlook-password-issues' },
    create: {
      slug: 'outlook-password-issues',
      title: 'Outlook Password Prompt Loop',
      content: 'If Outlook keeps prompting for password after a reset, clear cached credentials...',
      isPublic: true,
      category: 'email',
    },
    update: {},
  });

  console.log('Seed complete!');
  console.log('  Admin: admin@ticketsystem.local / password123');
  console.log('  Agent: agent@ticketsystem.local / password123');
  console.log('  User:  user@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
