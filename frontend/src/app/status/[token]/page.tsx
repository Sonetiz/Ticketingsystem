'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function publicApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

export default function StatusPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['public-ticket', token],
    queryFn: () => publicApi<{
      number: number;
      title: string;
      status: string;
      createdAt: string;
      messages: Array<{ id: string; body: string; createdAt: string; author: { name: string } | null }>;
    }>(`/public/tickets/${token}`),
  });

  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      publicApi(`/public/tickets/${token}/reply`, { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-ticket', token] });
      setReply('');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => publicApi(`/public/tickets/${token}/confirm-resolution`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public-ticket', token] }),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading ticket...</p></div>;
  if (error || !ticket) return <div className="min-h-screen flex items-center justify-center"><p>Invalid or expired link</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-muted-foreground">Ticket #{ticket.number}</p>
          <h1 className="text-2xl font-bold mt-1">{ticket.title}</h1>
          <div className="flex gap-3 mt-3 text-sm">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">{ticket.status.replace(/_/g, ' ')}</span>
            <span className="text-muted-foreground">Created {formatDate(ticket.createdAt)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">Updates</h2>
          {ticket.messages.map((msg) => (
            <div key={msg.id} className="border-l-2 border-blue-400 pl-4 py-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{msg.author?.name || 'Support'}</span>
                <span>{formatDate(msg.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
          {!ticket.messages.length && <p className="text-sm text-muted-foreground">No updates yet</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
          <h2 className="font-semibold">Reply</h2>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="w-full p-3 border rounded-lg min-h-[100px]"
            placeholder="Type your reply..."
          />
          <button
            onClick={() => replyMutation.mutate(reply)}
            disabled={!reply.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Send Reply
          </button>
        </div>

        {ticket.status === 'resolved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="font-medium text-green-800">This ticket has been resolved.</p>
            <button
              onClick={() => confirmMutation.mutate()}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
            >
              Confirm Resolution & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
