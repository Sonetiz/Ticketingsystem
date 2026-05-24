'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { DashboardStats } from '@ticketsystem/shared';

export default function PortalDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardStats>('/tickets/dashboard'),
  });

  const cards = [
    { label: 'Open Tickets', value: stats?.openTickets, href: '/portal/tickets?view=active', color: 'border-blue-500' },
    { label: 'My Assigned', value: stats?.myAssigned, href: '/portal/tickets?view=mine', color: 'border-purple-500' },
    { label: 'Team Queue', value: stats?.teamQueue, href: '/portal/tickets?view=team', color: 'border-indigo-500' },
    { label: 'Unassigned', value: stats?.unassigned, href: '/portal/unassigned-tickets', color: 'border-sky-500' },
    { label: 'On Hold', value: stats?.onHold, href: '/portal/tickets?view=on-hold', color: 'border-amber-500' },
    { label: 'Overdue', value: stats?.overdue, href: '/portal/tickets?view=overdue', color: 'border-red-500' },
    { label: 'SLA Breached', value: stats?.slaBreached, href: '/portal/tickets?slaBreached=true', color: 'border-orange-500' },
    { label: 'Resolved Today', value: stats?.resolvedToday, href: '/portal/tickets?view=recent', color: 'border-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/portal/tickets/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          New Ticket
        </Link>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`p-5 bg-card rounded-xl border-l-4 ${card.color} border border-border hover:shadow-md transition`}
            >
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-3xl font-bold mt-1">{card.value ?? 0}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
