'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api, getCsrfToken } from '@/lib/api';
import { cn, formatDate, statusColors, priorityColors } from '@/lib/utils';

interface TicketDetail {
  id: string;
  number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: string | null;
  isOnHold: boolean;
  holdReason: string | null;
  holdUntil: string | null;
  assignee: { id: string; name: string } | null;
  assignedTeam: { id: string; name: string } | null;
  requester: { id: string; name: string; email: string } | null;
  messages: Array<{
    id: string;
    kind: string;
    body: string;
    isPublic: boolean;
    createdAt: string;
    author: { name: string } | null;
  }>;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState('');
  const [replyKind, setReplyKind] = useState<'public_reply' | 'internal_note'>('public_reply');
  const [holdReason, setHoldReason] = useState('waiting_for_user_reply');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api<TicketDetail>(`/tickets/${id}`),
  });

  const replyMutation = useMutation({
    mutationFn: (body: { body: string; kind: string }) =>
      api(`/tickets/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setReplyBody('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  });

  const holdMutation = useMutation({
    mutationFn: () =>
      api(`/tickets/${id}/hold`, {
        method: 'POST',
        body: JSON.stringify({ holdReason }),
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  });

  const unholdMutation = useMutation({
    mutationFn: () =>
      api(`/tickets/${id}/unhold`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  });

  const magicLinkMutation = useMutation({
    mutationFn: () =>
      api<{ url: string }>(`/tickets/${id}/magic-link`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      }),
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.url);
      alert('Magic link copied to clipboard');
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (!ticket) return <p>Ticket not found</p>;

  const internalNotes = ticket.messages.filter((m) => !m.isPublic);
  const publicMessages = ticket.messages.filter((m) => m.isPublic);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <span className="text-sm text-muted-foreground">#{ticket.number}</span>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <h2 className="font-semibold">Conversation</h2>
          {publicMessages.map((msg) => (
            <div key={msg.id} className="border-l-2 border-blue-400 pl-4 py-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{msg.author?.name || 'System'} · Public</span>
                <span>{formatDate(msg.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
          {!publicMessages.length && <p className="text-sm text-muted-foreground">No public messages yet</p>}
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 rounded-xl border border-amber-200 p-4 space-y-4">
          <h2 className="font-semibold text-amber-800 dark:text-amber-200">Internal Notes</h2>
          {internalNotes.map((msg) => (
            <div key={msg.id} className="border-l-2 border-amber-400 pl-4 py-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{msg.author?.name || 'System'} · Internal</span>
                <span>{formatDate(msg.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setReplyKind('public_reply')}
              className={cn('px-3 py-1 rounded text-sm', replyKind === 'public_reply' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
            >
              Public Reply
            </button>
            <button
              onClick={() => setReplyKind('internal_note')}
              className={cn('px-3 py-1 rounded text-sm', replyKind === 'internal_note' ? 'bg-amber-600 text-white' : 'bg-muted')}
            >
              Internal Note
            </button>
          </div>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            className="w-full p-3 border border-border rounded-lg bg-background min-h-[100px]"
            placeholder={replyKind === 'public_reply' ? 'Reply to requester...' : 'Internal note (not visible to user)...'}
          />
          <button
            onClick={() => replyMutation.mutate({ body: replyBody, kind: replyKind })}
            disabled={!replyBody.trim() || replyMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold">Controls</h3>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              value={ticket.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-sm"
            >
              {['new', 'open', 'in_progress', 'waiting_for_user', 'waiting_for_vendor', 'on_hold', 'resolved', 'closed', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={cn('px-2 py-1 rounded text-xs', statusColors[ticket.status])}>{ticket.status}</span>
            <span className={cn('px-2 py-1 rounded text-xs', priorityColors[ticket.priority])}>{ticket.priority}</span>
            {ticket.isOnHold && <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">ON HOLD</span>}
          </div>
          {ticket.dueAt && (
            <p className="text-sm">Due: {formatDate(ticket.dueAt)}</p>
          )}
          {ticket.requester && (
            <p className="text-sm">Requester: {ticket.requester.name} ({ticket.requester.email})</p>
          )}
          {ticket.assignee && <p className="text-sm">Assignee: {ticket.assignee.name}</p>}
          {ticket.assignedTeam && <p className="text-sm">Team: {ticket.assignedTeam.name}</p>}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold">Hold</h3>
          {ticket.isOnHold ? (
            <div>
              <p className="text-sm text-amber-700">Reason: {ticket.holdReason}</p>
              {ticket.holdUntil && <p className="text-sm">Until: {formatDate(ticket.holdUntil)}</p>}
              <button onClick={() => unholdMutation.mutate()} className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm">
                Remove Hold
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-background text-sm"
              >
                <option value="waiting_for_user_reply">Waiting for user reply</option>
                <option value="waiting_for_vendor">Waiting for vendor</option>
                <option value="waiting_for_maintenance_window">Maintenance window</option>
                <option value="waiting_for_approval">Waiting for approval</option>
                <option value="waiting_for_delivery">Hardware/software delivery</option>
              </select>
              <button onClick={() => holdMutation.mutate()} className="px-3 py-1 bg-amber-600 text-white rounded text-sm">
                Put on Hold
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => magicLinkMutation.mutate()}
          className="w-full px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
        >
          Copy Status Page Link
        </button>
      </div>
    </div>
  );
}
