'use client';

import Link from 'next/link';

export default function ManageOverviewPage() {
  const sections = [
    { href: '/manage/users', title: 'Users', desc: 'Manage user accounts and role assignments' },
    { href: '/manage/roles', title: 'Roles & Permissions', desc: 'Configure RBAC roles and permissions' },
    { href: '/manage/teams', title: 'Teams', desc: 'Manage support teams and memberships' },
    { href: '/manage/statuses', title: 'Ticket Statuses', desc: 'Configure ticket status workflow' },
    { href: '/manage/sla', title: 'SLA Rules', desc: 'Configure SLA targets and escalation thresholds' },
    { href: '/manage/integrations', title: 'Integrations', desc: 'Email and Microsoft Teams connector settings' },
    { href: '/manage/templates', title: 'Templates', desc: 'Project and notification templates' },
    { href: '/manage/api-tokens', title: 'API Tokens', desc: 'Manage integration API tokens' },
    { href: '/manage/settings', title: 'System Settings', desc: 'Global key/value configuration' },
    { href: '/manage/audit', title: 'Audit Log', desc: 'View system audit trail' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Management</h1>
      <p className="text-muted-foreground">Administrative configuration for the ITSM ticketing system.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition">
            <h2 className="font-semibold">{s.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
