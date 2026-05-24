'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { notifications } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifications.list(),
  });

  const markReadMutation = useMutation({
    mutationFn: notifications.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notifications.markAllRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          type="button"
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending}
          className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {data?.map((n) => (
            <div
              key={n.id}
              className={`p-4 ${!n.readAt ? 'bg-primary/5' : ''}`}
            >
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                  {n.payload?.ticketId && (
                    <Link
                      href={`/portal/tickets/${n.payload.ticketId}`}
                      className="text-sm text-primary mt-2 inline-block hover:underline"
                    >
                      View ticket
                    </Link>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
                  {!n.readAt && (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="text-xs text-primary mt-2 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!data?.length && (
            <p className="p-8 text-center text-muted-foreground">No notifications</p>
          )}
        </div>
      )}
    </div>
  );
}
