'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ProblemRecord {
  id: string;
  title: string;
  status: string;
  isKnownError: boolean;
  updatedAt: string;
  ticket: { id: string; number: number; title: string };
}

export default function ProblemsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['problems'],
    queryFn: async () => {
      try {
        return await api<ProblemRecord[]>('/itsm/problems');
      } catch {
        return null;
      }
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Problem Management</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : data === null ? (
        <p className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
          Problem records are not available yet.
        </p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Problem</th>
                  <th className="text-left p-3 font-medium">Ticket</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Known error</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{p.title}</td>
                    <td className="p-3">
                      <Link href={`/portal/tickets/${p.ticket.id}`} className="text-primary font-mono">
                        #{p.ticket.number}
                      </Link>
                    </td>
                    <td className="p-3 capitalize">{p.status}</td>
                    <td className="p-3">{p.isKnownError ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data?.length && (
            <p className="p-8 text-center text-muted-foreground">No problem records</p>
          )}
        </div>
      )}
    </div>
  );
}
