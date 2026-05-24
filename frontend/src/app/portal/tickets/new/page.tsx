'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { FieldLabel, TextInput, TextArea, SelectInput, BtnPrimary } from '@/components/ui/modal';

interface Team { id: string; name: string; memberships: Array<{ user: { id: string; name: string } }> }
interface Project { id: string; name: string }
interface Agent { id: string; name: string }

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueAt, setDueAt] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: teams } = useQuery({ queryKey: ['lookup-teams'], queryFn: () => api<Team[]>('/lookups/teams') });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api<Project[]>('/projects') });
  const { data: agents } = useQuery({ queryKey: ['lookup-agents'], queryFn: () => api<Agent[]>('/lookups/agents') });

  const selectedTeam = teams?.find((t) => t.id === assignedTeamId);
  const teamMembers = selectedTeam?.memberships.map((m) => m.user) || agents || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { title, description, priority };
      if (dueAt) body.dueAt = new Date(dueAt).toISOString();
      if (projectId) body.projectId = projectId;
      if (assignedTeamId) body.assignedTeamId = assignedTeamId;
      if (assigneeId) body.assigneeId = assigneeId;

      const ticket = await api<{ id: string }>('/tickets', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      });
      router.push(`/portal/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Create Ticket</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div><FieldLabel>Title</FieldLabel><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div><FieldLabel>Description</FieldLabel><TextArea value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-[150px]" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel>Priority</FieldLabel>
            <SelectInput value={priority} onChange={(e) => setPriority(e.target.value)}>
              {['normal', 'elevated', 'high', 'urgent', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
            </SelectInput>
          </div>
          <div><FieldLabel>Due date</FieldLabel><TextInput type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel>Project</FieldLabel>
            <SelectInput value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">None</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectInput>
          </div>
          <div><FieldLabel>Team</FieldLabel>
            <SelectInput value={assignedTeamId} onChange={(e) => { setAssignedTeamId(e.target.value); setAssigneeId(''); }}>
              <option value="">Default team</option>
              {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectInput>
          </div>
        </div>
        <div><FieldLabel>Assignee</FieldLabel>
          <SelectInput value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {teamMembers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </SelectInput>
        </div>
        <BtnPrimary type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Ticket'}</BtnPrimary>
      </form>
    </div>
  );
}
