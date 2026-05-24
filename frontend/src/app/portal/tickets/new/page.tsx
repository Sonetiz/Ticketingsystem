'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getCsrfToken } from '@/lib/api';

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ticket = await api<{ id: string }>('/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, description, priority }),
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      });
      router.push(`/portal/tickets/${ticket.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Create Ticket</h1>
      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background min-h-[150px]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          >
            {['normal', 'elevated', 'high', 'urgent', 'critical'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
}
