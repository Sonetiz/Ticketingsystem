'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, tickets } from '@/lib/api';
import { toast } from '@/lib/toast';

export function WatchersPanel({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();

  const { data: watchers = [] } = useQuery({
    queryKey: ['ticket', ticketId, 'watchers'],
    queryFn: () => tickets.watchers(ticketId),
  });

  const { data: agents } = useQuery({
    queryKey: ['lookups', 'agents'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/lookups/agents'),
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => tickets.addWatcher(ticketId, userId),
    onSuccess: () => {
      toast.success('Watcher added');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'watchers'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => tickets.removeWatcher(ticketId, userId),
    onSuccess: () => {
      toast.success('Watcher removed');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'watchers'] });
    },
  });

  const watcherIds = new Set(watchers.map((w) => w.userId));

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-semibold">Watchers</h3>
      <ul className="space-y-1">
        {watchers.map((w) => (
          <li key={w.id} className="flex items-center justify-between text-sm">
            <span>{w.user.name}</span>
            <button
              type="button"
              onClick={() => removeMutation.mutate(w.userId)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {!watchers.length && <li className="text-sm text-muted-foreground">No watchers</li>}
      </ul>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            addMutation.mutate(e.target.value);
            e.target.value = '';
          }
        }}
        className="w-full p-2 border border-border rounded-lg bg-background text-sm"
      >
        <option value="">Add watcher…</option>
        {agents?.filter((a) => !watcherIds.has(a.id)).map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </div>
  );
}
