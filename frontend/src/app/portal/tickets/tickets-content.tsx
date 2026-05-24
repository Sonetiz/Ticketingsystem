'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn, formatDate, statusColors, priorityColors } from '@/lib/utils';
import type { PaginatedResult, TicketSummary } from '@ticketsystem/shared';

export default function TicketsPageContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'active';

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', view],
    queryFn: () =>
      api<PaginatedResult<TicketSummary>>(`/tickets?view=${view}&limit=50`),
  });

  const viewTitles: Record<string, string> = {
    active: 'Active Queue',
    mine: 'My Assigned Tickets',
    team: 'Team Queue',
    'on-hold': 'On Hold Tickets',
    overdue: 'Overdue Tickets',
    recent: 'Recently Updated',
    all: 'All Tickets',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{viewTitles[view] || 'Tickets'}</h1>
        <Link
          href="/portal/tickets/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
        >
          New Ticket
        </Link>
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">#</th>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Priority</th>
                <th className="text-left p-3 font-medium">Assignee</th>
                <th className="text-left p-3 font-medium">Due</th>
                <th className="text-left p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((ticket) => (
                <tr key={ticket.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-3">
                    <Link href={`/portal/tickets/${ticket.id}`} className="text-primary font-mono">
                      {ticket.number}
                    </Link>
                  </td>
                  <td className="p-3 max-w-xs truncate">
                    <Link href={`/portal/tickets/${ticket.id}`}>{ticket.title}</Link>
                    {ticket.isOnHold && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">HOLD</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusColors[ticket.status] || 'bg-gray-100')}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityColors[ticket.priority] || 'bg-gray-100')}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="p-3">{ticket.assignee?.name || '—'}</td>
                  <td className="p-3 text-xs">{ticket.dueAt ? formatDate(ticket.dueAt) : '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(ticket.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.data.length && (
            <p className="p-8 text-center text-muted-foreground">No tickets found</p>
          )}
        </div>
      )}
    </div>
  );
}
