'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { tickets } from '@/lib/api';
import { cn, formatDate, statusColors } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function RequesterHomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['requester-tickets'],
    queryFn: () => tickets.list({ view: 'mine', limit: 20 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track the status of your support tickets.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/portal/tickets/${ticket.id}`}
              className="block bg-card rounded-xl border border-border p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-xs font-mono text-muted-foreground">#{ticket.number}</span>
                  <p className="font-medium mt-0.5">{ticket.title}</p>
                </div>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium shrink-0', statusColors[ticket.status])}>
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Updated {formatDate(ticket.updatedAt)}</p>
            </Link>
          ))}
          {!data?.data.length && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">You have no open requests.</p>
              <Link href="/portal/tickets/new" className="text-primary text-sm mt-2 inline-block hover:underline">
                Submit a new request
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
