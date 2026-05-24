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
  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [impact, setImpact] = useState('medium');
  const [urgency, setUrgency] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: teams } = useQuery({ queryKey: ['lookup-teams'], queryFn: () => api<Team[]>('/lookups/teams') });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api<Project[]>('/projects') });
  const { data: agents } = useQuery({ queryKey: ['lookup-agents'], queryFn: () => api<Agent[]>('/lookups/agents') });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api<Array<{ id: string; name: string }>>('/lookups/categories') });
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: () => api<Array<{ id: string; name: string }>>('/lookups/services') });
  const { data: templates } = useQuery({ queryKey: ['ticket-templates'], queryFn: () => api<Array<{ id: string; name: string; title: string; description: string | null; priority: string; categoryId: string | null }>>('/extras/ticket-templates') });

  const applyTemplate = (templateId: string) => {
    const t = templates?.find((x) => x.id === templateId);
    if (!t) return;
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority(t.priority);
    if (t.categoryId) setCategoryId(t.categoryId);
  };

  const selectedTeam = teams?.find((t) => t.id === assignedTeamId);
  const teamMembers = selectedTeam?.memberships.map((m) => m.user) || agents || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { title, description, priority, impact, urgency };
      if (dueAt) body.dueAt = new Date(dueAt).toISOString();
      if (projectId) body.projectId = projectId;
      if (assignedTeamId) body.assignedTeamId = assignedTeamId;
      if (assigneeId) body.assigneeId = assigneeId;
      if (categoryId) body.categoryId = categoryId;
      if (serviceId) body.serviceId = serviceId;

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
        {templates && templates.length > 0 && (
          <div>
            <FieldLabel>Template</FieldLabel>
            <SelectInput value="" onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
              <option value="">Choose a template…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectInput>
          </div>
        )}
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
          <div><FieldLabel>Category</FieldLabel>
            <SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          </div>
          <div><FieldLabel>Service</FieldLabel>
            <SelectInput value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">None</option>
              {services?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectInput>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><FieldLabel>Impact</FieldLabel>
            <SelectInput value={impact} onChange={(e) => setImpact(e.target.value)}>
              {['low', 'medium', 'high'].map((v) => <option key={v} value={v}>{v}</option>)}
            </SelectInput>
          </div>
          <div><FieldLabel>Urgency</FieldLabel>
            <SelectInput value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              {['low', 'medium', 'high'].map((v) => <option key={v} value={v}>{v}</option>)}
            </SelectInput>
          </div>
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
