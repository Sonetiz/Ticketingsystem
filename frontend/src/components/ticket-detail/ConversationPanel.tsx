'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { TicketDetail } from '@/lib/api';

export function ConversationPanel({ ticket }: { ticket: TicketDetail }) {
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState('');
  const [replyKind, setReplyKind] = useState<'public_reply' | 'internal_note'>('public_reply');

  const { data: canned } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: () => api<Array<{ id: string; name: string; body: string }>>('/extras/canned-responses'),
  });

  const insertCanned = (body: string) => {
    const rendered = body
      .replace(/\{\{ticket\.number\}\}/g, String(ticket.number))
      .replace(/\{\{ticket\.title\}\}/g, ticket.title)
      .replace(/\{\{requester\.name\}\}/g, ticket.requester?.name || '');
    setReplyBody((prev) => (prev ? `${prev}\n\n${rendered}` : rendered));
  };

  const replyMutation = useMutation({
    mutationFn: (body: { body: string; kind: string }) =>
      api(`/tickets/${ticket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Message sent');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
      setReplyBody('');
    },
  });

  const internalNotes = ticket.messages.filter((m) => !m.isPublic);
  const publicMessages = ticket.messages.filter((m) => m.isPublic);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <h2 className="font-semibold">Conversation</h2>
        {publicMessages.map((msg) => (
          <div key={msg.id} className="border-l-2 border-blue-400 pl-4 py-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{msg.author?.name || 'System'} · Public</span>
              <span>{formatDate(msg.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{msg.body}</p>
          </div>
        ))}
        {!publicMessages.length && <p className="text-sm text-muted-foreground">No public messages yet</p>}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950 rounded-xl border border-amber-200 dark:border-amber-800 p-4 space-y-4">
        <h2 className="font-semibold text-amber-800 dark:text-amber-200">Internal Notes</h2>
        {internalNotes.map((msg) => (
          <div key={msg.id} className="border-l-2 border-amber-400 pl-4 py-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{msg.author?.name || 'System'} · Internal</span>
              <span>{formatDate(msg.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{msg.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        {canned && canned.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {canned.map((c) => (
              <button key={c.id} type="button" onClick={() => insertCanned(c.body)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80">
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReplyKind('public_reply')}
            className={cn('px-3 py-1 rounded text-sm', replyKind === 'public_reply' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
          >
            Public Reply
          </button>
          <button
            type="button"
            onClick={() => setReplyKind('internal_note')}
            className={cn('px-3 py-1 rounded text-sm', replyKind === 'internal_note' ? 'bg-amber-600 text-white' : 'bg-muted')}
          >
            Internal Note
          </button>
        </div>
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          className="w-full p-3 border border-border rounded-lg bg-background min-h-[100px] text-sm"
          placeholder={replyKind === 'public_reply' ? 'Reply to requester…' : 'Internal note…'}
        />
        <button
          type="button"
          onClick={() => replyMutation.mutate({ body: replyBody, kind: replyKind })}
          disabled={!replyBody.trim() || replyMutation.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
