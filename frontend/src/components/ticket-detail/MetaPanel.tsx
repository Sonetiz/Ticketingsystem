'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, tickets } from '@/lib/api';
import { toast } from '@/lib/toast';
import { DEFAULT_PRIORITIES, DEFAULT_STATUSES } from '@ticketsystem/shared';
import type { TicketDetail } from '@/lib/api';

export function MetaPanel({
  ticket,
  currentUserId,
}: {
  ticket: TicketDetail;
  currentUserId?: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);

  const { data: agents } = useQuery({
    queryKey: ['lookups', 'agents'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/lookups/agents'),
  });

  const { data: teams } = useQuery({
    queryKey: ['lookups', 'teams'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/lookups/teams'),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/projects'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof tickets.update>[1]) => tickets.update(ticket.id, data),
    onSuccess: () => {
      toast.success('Ticket updated');
      invalidate();
      setEditing(false);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: { assigneeId?: string | null; assignedTeamId?: string | null }) =>
      tickets.assign(ticket.id, data),
    onSuccess: () => {
      toast.success('Assignment updated');
      invalidate();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => tickets.update(ticket.id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      invalidate();
    },
  });

  const assignToMe = () => {
    if (currentUserId) assignMutation.mutate({ assigneeId: currentUserId });
  };

  const [tagInput, setTagInput] = useState('');

  const saveTags = (tags: string[]) => {
    updateMutation.mutate({ tags });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Details</h3>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">
            Edit title / description
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateMutation.mutate({ title, description })}
              disabled={updateMutation.isPending}
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setTitle(ticket.title); setDescription(ticket.description); }}
              className="text-xs px-2 py-1 border border-border rounded"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-sm font-medium"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-sm min-h-[120px]"
          />
        </div>
      ) : (
        <p className="text-muted-foreground whitespace-pre-wrap text-sm">{ticket.description}</p>
      )}

      {currentUserId && ticket.assignee?.id !== currentUserId && (
        <button
          type="button"
          onClick={assignToMe}
          disabled={assignMutation.isPending}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50"
        >
          Assign to me
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ticket.status !== 'resolved' && ticket.status !== 'closed' && ticket.status !== 'cancelled' && (
          <button
            type="button"
            onClick={() => statusMutation.mutate('resolved')}
            disabled={statusMutation.isPending}
            className="col-span-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Resolve ticket
          </button>
        )}
        {ticket.status === 'resolved' && (
          <>
            <button
              type="button"
              onClick={() => statusMutation.mutate('closed')}
              disabled={statusMutation.isPending}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => statusMutation.mutate('open')}
              disabled={statusMutation.isPending}
              className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50"
            >
              Reopen
            </button>
          </>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Status</label>
        <select
          value={ticket.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
          className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-sm"
        >
          {DEFAULT_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Priority</label>
        <select
          value={ticket.priority}
          onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
          className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-sm"
        >
          {DEFAULT_PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Assignee</label>
        <select
          value={ticket.assignee?.id || ''}
          onChange={(e) => assignMutation.mutate({ assigneeId: e.target.value || null })}
          className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-sm"
        >
          <option value="">Unassigned</option>
          {agents?.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Team</label>
        <select
          value={ticket.assignedTeam?.id || ''}
          onChange={(e) => assignMutation.mutate({ assignedTeamId: e.target.value || null })}
          className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-sm"
        >
          <option value="">No team</option>
          {teams?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Due date</label>
        <input
          type="datetime-local"
          value={ticket.dueAt ? ticket.dueAt.slice(0, 16) : ''}
          onChange={(e) =>
            updateMutation.mutate({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })
          }
          className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-sm"
        />
      </div>

      {ticket.requester && (
        <p className="text-sm">Requester: {ticket.requester.name} ({ticket.requester.email})</p>
      )}

      <div>
        <label className="text-xs text-muted-foreground">Project</label>
        <select
          value={ticket.project?.id || ''}
          onChange={(e) => updateMutation.mutate({ projectId: e.target.value || null })}
          className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-sm"
        >
          <option value="">No project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Tags</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {(ticket.tags || []).map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs">
              {t.tag}
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => saveTags((ticket.tags || []).filter((x) => x.id !== t.id).map((x) => x.tag))}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                e.preventDefault();
                saveTags([...(ticket.tags || []).map((t) => t.tag), tagInput.trim()]);
                setTagInput('');
              }
            }}
            placeholder="Add tag…"
            className="flex-1 p-2 border border-border rounded-lg bg-background text-sm"
          />
        </div>
      </div>
    </div>
  );
}
