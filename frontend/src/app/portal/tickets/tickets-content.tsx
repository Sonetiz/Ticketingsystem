'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { tickets, api } from '@/lib/api';
import { cn, formatDate, statusColors, priorityColors, useDebouncedValue } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';
import { DEFAULT_PRIORITIES, DEFAULT_STATUSES } from '@ticketsystem/shared';

export default function TicketsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const view = searchParams.get('view') ?? 'active';
  const page = Number(searchParams.get('page') || '1');
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const slaBreached = searchParams.get('slaBreached') === 'true';
  const overdue = searchParams.get('overdue') === 'true';
  const urlQuery = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedQ = useDebouncedValue(searchInput, 300);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (debouncedQ !== urlQuery) {
      updateParams({ q: debouncedQ || null, page: '1' });
    }
  }, [debouncedQ, urlQuery, updateParams]);

  const filters = {
    view,
    page,
    limit: 25,
    q: urlQuery || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    slaBreached: slaBreached || undefined,
    overdue: overdue || undefined,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => tickets.list(filters),
  });

  const { data: agents } = useQuery({
    queryKey: ['lookups', 'agents'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/lookups/agents'),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: () => tickets.bulkAssign(Array.from(selected), { assigneeId: bulkAssignee }),
    onSuccess: () => {
      toast.success('Tickets assigned');
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: () => tickets.bulkStatus(Array.from(selected), bulkStatus),
    onSuccess: () => {
      toast.success('Status updated');
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const bulkCloseMutation = useMutation({
    mutationFn: () => tickets.bulkClose(Array.from(selected)),
    onSuccess: () => {
      toast.success('Tickets closed');
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const toggleAll = () => {
    if (!data?.data.length) return;
    if (selected.size === data.data.length) setSelected(new Set());
    else setSelected(new Set(data.data.map((t) => t.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const viewTitles: Record<string, string> = {
    active: 'Active Queue',
    mine: 'My Assigned Tickets',
    team: 'Team Queue',
    unassigned: 'Unassigned Tickets',
    'on-hold': 'On Hold Tickets',
    overdue: 'Overdue Tickets',
    recent: 'Recently Updated',
    all: 'All Tickets',
  };

  const viewOptions = [
    { value: 'active', label: viewTitles.active },
    { value: 'mine', label: viewTitles.mine },
    { value: 'team', label: viewTitles.team },
    { value: 'unassigned', label: viewTitles.unassigned },
    { value: 'on-hold', label: viewTitles['on-hold'] },
    { value: 'overdue', label: viewTitles.overdue },
    { value: 'recent', label: viewTitles.recent },
    { value: 'all', label: viewTitles.all },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Tickets</h1>
          <select
            value={view}
            onChange={(e) => updateParams({ view: e.target.value || null, page: '1' })}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            aria-label="Select ticket view"
          >
            {viewOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Link
          href="/portal/tickets/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm text-center"
        >
          New Ticket
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search tickets…"
          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
          aria-label="Search tickets"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => updateParams({ status: e.target.value || null, page: '1' })}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {DEFAULT_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => updateParams({ priority: e.target.value || null, page: '1' })}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            {DEFAULT_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={slaBreached}
              onChange={(e) => updateParams({ slaBreached: e.target.checked ? 'true' : null, page: '1' })}
            />
            SLA breached
          </label>
          <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(e) => updateParams({ overdue: e.target.checked ? 'true' : null, page: '1' })}
            />
            Overdue
          </label>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted rounded-lg border border-border">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <select
            value={bulkAssignee}
            onChange={(e) => setBulkAssignee(e.target.value)}
            className="px-2 py-1.5 border border-border rounded-lg bg-background text-sm"
          >
            <option value="">Assign to…</option>
            {agents?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!bulkAssignee || bulkAssignMutation.isPending}
            onClick={() => bulkAssignMutation.mutate()}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
          >
            Assign
          </button>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="px-2 py-1.5 border border-border rounded-lg bg-background text-sm"
          >
            <option value="">Set status…</option>
            {DEFAULT_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!bulkStatus || bulkStatusMutation.isPending}
            onClick={() => bulkStatusMutation.mutate()}
            className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-background disabled:opacity-50"
          >
            Update status
          </button>
          <button
            type="button"
            disabled={bulkCloseMutation.isPending}
            onClick={() => bulkCloseMutation.mutate()}
            className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-muted-foreground hover:text-foreground ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <TicketsTableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={!!data?.data.length && selected.size === data.data.length}
                      onChange={toggleAll}
                      aria-label="Select all tickets"
                    />
                  </th>
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Priority</th>
                  <th className="text-left p-3 font-medium">Assignee</th>
                  <th className="text-left p-3 font-medium">Due</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className={cn(isFetching && 'opacity-60')}>
                {data?.data.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-border hover:bg-muted/50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(ticket.id)}
                        onChange={() => toggleOne(ticket.id)}
                        aria-label={`Select ticket ${ticket.number}`}
                      />
                    </td>
                    <td className="p-3">
                      <Link href={`/portal/tickets/${ticket.id}`} className="text-primary font-mono">
                        {ticket.number}
                      </Link>
                    </td>
                    <td className="p-3 max-w-xs truncate">
                      <Link href={`/portal/tickets/${ticket.id}`}>{ticket.title}</Link>
                      {ticket.isOnHold && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded">HOLD</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusColors[ticket.status] || 'bg-gray-100 dark:bg-gray-800')}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityColors[ticket.priority] || 'bg-gray-100 dark:bg-gray-800')}>
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
          </div>
          {!data?.data.length && (
            <p className="p-8 text-center text-muted-foreground">No tickets found</p>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border text-sm">
              <span className="text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} tickets)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => updateParams({ page: String(data.page - 1) })}
                  className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => updateParams({ page: String(data.page + 1) })}
                  className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketsTableSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
