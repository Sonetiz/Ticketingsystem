'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { TicketDetail } from '@/lib/api';

export function HoldPanel({ ticket }: { ticket: TicketDetail }) {
  const queryClient = useQueryClient();
  const [holdReason, setHoldReason] = useState('waiting_for_user_reply');
  const [holdUntil, setHoldUntil] = useState('');
  const [holdNote, setHoldNote] = useState('');

  const defaultHoldUntil = (reason: string) => {
    if (reason === 'waiting_for_user_reply') {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().slice(0, 16);
    }
    return '';
  };

  const holdMutation = useMutation({
    mutationFn: () =>
      api(`/tickets/${ticket.id}/hold`, {
        method: 'POST',
        body: JSON.stringify({
          holdReason,
          holdNote: holdNote || undefined,
          holdUntil: holdUntil ? new Date(holdUntil).toISOString() : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success('Ticket placed on hold');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    },
  });

  const unholdMutation = useMutation({
    mutationFn: () => api(`/tickets/${ticket.id}/unhold`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Hold removed');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: () => api<{ url: string }>(`/tickets/${ticket.id}/magic-link`, { method: 'POST' }),
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.url);
      toast.success('Magic link copied to clipboard');
    },
  });

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold">Hold</h3>
        {ticket.isOnHold ? (
          <div>
            <p className="text-sm text-amber-700 dark:text-amber-300">Reason: {ticket.holdReason}</p>
            {ticket.holdUntil && <p className="text-sm">Until: {formatDate(ticket.holdUntil)}</p>}
            <button
              type="button"
              onClick={() => unholdMutation.mutate()}
              className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              Remove Hold
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={holdReason}
              onChange={(e) => {
                const reason = e.target.value;
                setHoldReason(reason);
                if (!holdUntil) setHoldUntil(defaultHoldUntil(reason));
              }}
              className="w-full p-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="waiting_for_user_reply">Waiting for user reply</option>
              <option value="waiting_for_vendor">Waiting for vendor</option>
              <option value="waiting_for_maintenance_window">Maintenance window</option>
              <option value="waiting_for_approval">Waiting for approval</option>
              <option value="waiting_for_delivery">Hardware/software delivery</option>
            </select>
            <input
              type="datetime-local"
              value={holdUntil || defaultHoldUntil(holdReason)}
              onChange={(e) => setHoldUntil(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-background text-sm"
            />
            <textarea
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-background text-sm min-h-[60px]"
              placeholder="Hold note (optional)"
            />
            <button
              type="button"
              onClick={() => holdMutation.mutate()}
              className="px-3 py-1 bg-amber-600 text-white rounded text-sm"
            >
              Put on Hold
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => magicLinkMutation.mutate()}
        className="w-full px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
      >
        Copy Status Page Link
      </button>
    </>
  );
}
