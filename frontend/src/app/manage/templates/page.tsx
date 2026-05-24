'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, TextArea, SelectInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

type Tab = 'project' | 'notification';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  tickets: Array<{ title: string; description?: string | null; priority: string; sortOrder: number }>;
}

interface NotificationTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string | null;
  body: string;
  channel: string;
}

export default function ManageTemplatesPage() {
  const [tab, setTab] = useState<Tab>('project');
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<ProjectTemplate | null>(null);
  const [editNotification, setEditNotification] = useState<NotificationTemplate | null>(null);

  const { data: projectTemplates } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => api<ProjectTemplate[]>('/manage/project-templates'),
  });

  const { data: notificationTemplates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => api<NotificationTemplate[]>('/manage/notification-templates'),
  });

  const invalidateProject = () => queryClient.invalidateQueries({ queryKey: ['project-templates'] });
  const invalidateNotification = () => queryClient.invalidateQueries({ queryKey: ['notification-templates'] });

  const createProject = useMutation({
    mutationFn: (body: object) => api('/manage/project-templates', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidateProject(); setShowCreate(false); },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/manage/project-templates/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidateProject(); setEditProject(null); },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => api(`/manage/project-templates/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: invalidateProject,
  });

  const createNotification = useMutation({
    mutationFn: (body: object) => api('/manage/notification-templates', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidateNotification(); setShowCreate(false); },
  });

  const updateNotification = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/manage/notification-templates/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidateNotification(); setEditNotification(null); },
  });

  const deleteNotification = useMutation({
    mutationFn: (id: string) => api(`/manage/notification-templates/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: invalidateNotification,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Templates</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>New template</BtnPrimary>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['project', 'notification'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab === t ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}>
            {t === 'project' ? 'Project templates' : 'Notification templates'}
          </button>
        ))}
      </div>

      {tab === 'project' ? (
        <div className="space-y-3">
          {projectTemplates?.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border p-4">
              <div className="flex justify-between">
                <h3 className="font-medium">{t.name}</h3>
                <div className="space-x-2">
                  <button className="text-primary text-sm hover:underline" onClick={() => setEditProject(t)}>Edit</button>
                  <button className="text-red-600 text-sm hover:underline" onClick={() => { if (confirm('Delete?')) deleteProject.mutate(t.id); }}>Delete</button>
                </div>
              </div>
              {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
              <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                {t.tickets.map((tk, j) => <li key={j}>{tk.title}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Channel</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notificationTemplates?.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td className="p-3">{t.channel}</td>
                  <td className="p-3 space-x-2">
                    <button className="text-primary text-sm hover:underline" onClick={() => setEditNotification(t)}>Edit</button>
                    <button className="text-red-600 text-sm hover:underline" onClick={() => { if (confirm('Delete?')) deleteNotification.mutate(t.id); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && tab === 'project' && (
        <ProjectTemplateModal onClose={() => setShowCreate(false)} onSubmit={(d) => createProject.mutate(d)} loading={createProject.isPending} />
      )}
      {editProject && (
        <ProjectTemplateModal initial={editProject} onClose={() => setEditProject(null)} onSubmit={(d) => updateProject.mutate({ id: editProject.id, body: d })} loading={updateProject.isPending} />
      )}
      {showCreate && tab === 'notification' && (
        <NotificationTemplateModal onClose={() => setShowCreate(false)} onSubmit={(d) => createNotification.mutate(d)} loading={createNotification.isPending} />
      )}
      {editNotification && (
        <NotificationTemplateModal initial={editNotification} onClose={() => setEditNotification(null)} onSubmit={(d) => updateNotification.mutate({ id: editNotification.id, body: d })} loading={updateNotification.isPending} />
      )}
    </div>
  );
}

function ProjectTemplateModal({ initial, onClose, onSubmit, loading }: {
  initial?: ProjectTemplate; onClose: () => void; onSubmit: (data: object) => void; loading: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [tickets, setTickets] = useState<Array<{ title: string; description: string; priority: string }>>(
    initial?.tickets.map((t) => ({ title: t.title, description: t.description || '', priority: t.priority })) || [{ title: '', description: '', priority: 'normal' }],
  );

  const addTicket = () => setTickets([...tickets, { title: '', description: '', priority: 'normal' }]);
  const removeTicket = (i: number) => setTickets(tickets.filter((_, idx) => idx !== i));

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit project template' : 'New project template'} wide>
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, description: description || undefined, tickets: tickets.filter((t) => t.title) });
      }} className="space-y-4">
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><FieldLabel>Description</FieldLabel><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <FieldLabel>Tickets</FieldLabel>
            <BtnSecondary type="button" onClick={addTicket}>Add ticket</BtnSecondary>
          </div>
          {tickets.map((t, i) => (
            <div key={i} className="border border-border rounded-lg p-3 mb-2 space-y-2">
              <div className="flex gap-2">
                <TextInput placeholder="Title" value={t.title} onChange={(e) => { const next = [...tickets]; next[i].title = e.target.value; setTickets(next); }} className="flex-1" />
                <SelectInput value={t.priority} onChange={(e) => { const next = [...tickets]; next[i].priority = e.target.value; setTickets(next); }}>
                  {['normal', 'elevated', 'high', 'urgent', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
                </SelectInput>
                <button type="button" className="text-red-600 text-sm" onClick={() => removeTicket(i)}>×</button>
              </div>
              <TextInput placeholder="Description (optional)" value={t.description} onChange={(e) => { const next = [...tickets]; next[i].description = e.target.value; setTickets(next); }} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}

function NotificationTemplateModal({ initial, onClose, onSubmit, loading }: {
  initial?: NotificationTemplate; onClose: () => void; onSubmit: (data: object) => void; loading: boolean;
}) {
  const [slug, setSlug] = useState(initial?.slug || '');
  const [name, setName] = useState(initial?.name || '');
  const [subject, setSubject] = useState(initial?.subject || '');
  const [body, setBody] = useState(initial?.body || '');
  const [channel, setChannel] = useState(initial?.channel || 'email');

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit notification template' : 'New notification template'} wide>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ slug, name, subject: subject || undefined, body, channel }); }} className="space-y-4">
        <div><FieldLabel>Slug</FieldLabel><TextInput value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!!initial} /></div>
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><FieldLabel>Subject</FieldLabel><TextInput value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div>
          <FieldLabel>Channel</FieldLabel>
          <SelectInput value={channel} onChange={(e) => setChannel(e.target.value)}>
            {['email', 'teams', 'in_app'].map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectInput>
        </div>
        <div><FieldLabel>Body</FieldLabel><TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required /></div>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
