'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ApprovalRequest {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
  ticket: { id: string; number: number; title: string };
}

export default function ApprovalsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      try {
        return await api<ApprovalRequest[]>('/itsm/approvals');
      } catch {
        return null;
      }
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Approvals</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : data === null ? (
        <p className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
          Approval requests are not available yet.
        </p>
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {data?.map((item) => (
            <div key={item.id} className="p-4 flex justify-between gap-4">
              <div>
                <p className="font-medium">{item.title}</p>
                <Link href={`/portal/tickets/${item.ticket.id}`} className="text-sm text-primary hover:underline">
                  Ticket #{item.ticket.number}: {item.ticket.title}
                </Link>
              </div>
              <div className="text-right text-sm shrink-0">
                <span className="capitalize">{item.status}</span>
                {item.dueAt && (
                  <p className="text-xs text-muted-foreground mt-1">Due {formatDate(item.dueAt)}</p>
                )}
              </div>
            </div>
          ))}
          {!data?.length && (
            <p className="p-8 text-center text-muted-foreground">No pending approvals</p>
          )}
        </div>
      )}
    </div>
  );
}
