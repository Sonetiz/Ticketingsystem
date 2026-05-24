'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, TextArea, SelectInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

interface RecurringTask {
  id: string;
  name: string;
  titleTemplate: string;
  descriptionTemplate: string | null;
  rrule: string;
  isActive: boolean;
  priority: string;
  dueDateOffsetHours: number;
  assignedTeam: { id: string; name: string } | null;
  assignedTeamId: string | null;
}

interface Team { id: string; name: string }

const RRULE_PRESETS = [
  { label: 'Daily', value: 'FREQ=DAILY' },
  { label: 'Weekly (Monday)', value: 'FREQ=WEEKLY;BYDAY=MO' },
  { label: 'Monthly (1st)', value: 'FREQ=MONTHLY;BYMONTHDAY=1' },
  { label: 'Yearly (Jan 1)', value: 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1' },
];

const emptyForm = {
  name: '', titleTemplate: '', descriptionTemplate: '', rrule: 'FREQ=WEEKLY;BYDAY=MO',
  priority: 'normal', assignedTeamId: '', dueDateOffsetHours: 24, isActive: true,
};

export default function RecurringPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<RecurringTask | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: () => api<RecurringTask[]>('/recurring-tasks'),
  });

  const { data: teams } = useQuery({
    queryKey: ['lookup-teams'],
    queryFn: () => api<Team[]>('/lookups/teams'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api('/recurring-tasks', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recurring'] }); setShowForm(false); setForm(emptyForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/recurring-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['recurring'] }); setEditTask(null); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api(`/recurring-tasks/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive }), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring'] }),
  });

  const openEdit = (task: RecurringTask) => {
    setEditTask(task);
    setForm({
      name: task.name, titleTemplate: task.titleTemplate, descriptionTemplate: task.descriptionTemplate || '',
      rrule: task.rrule, priority: task.priority, assignedTeamId: task.assignedTeamId || '',
      dueDateOffsetHours: task.dueDateOffsetHours, isActive: task.isActive,
    });
  };

  const FormFields = () => (
    <div className="space-y-3">
      <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
      <div><FieldLabel>Ticket title template</FieldLabel><TextInput value={form.titleTemplate} onChange={(e) => setForm({ ...form, titleTemplate: e.target.value })} required /></div>
      <div><FieldLabel>Description template</FieldLabel><TextArea value={form.descriptionTemplate} onChange={(e) => setForm({ ...form, descriptionTemplate: e.target.value })} /></div>
      <div>
        <FieldLabel>Schedule</FieldLabel>
        <SelectInput value={form.rrule} onChange={(e) => setForm({ ...form, rrule: e.target.value })}>
          {RRULE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </SelectInput>
        <TextInput className="mt-1 font-mono text-xs" value={form.rrule} onChange={(e) => setForm({ ...form, rrule: e.target.value })} placeholder="Custom RRULE" />
      </div>
      <div><FieldLabel>Team</FieldLabel>
        <SelectInput value={form.assignedTeamId} onChange={(e) => setForm({ ...form, assignedTeamId: e.target.value })}>
          <option value="">None</option>
          {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </SelectInput>
      </div>
      <div><FieldLabel>Priority</FieldLabel>
        <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {['normal', 'elevated', 'high', 'urgent', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
        </SelectInput>
      </div>
      <div><FieldLabel>Due date offset (hours)</FieldLabel><TextInput type="number" value={form.dueDateOffsetHours} onChange={(e) => setForm({ ...form, dueDateOffsetHours: parseInt(e.target.value, 10) })} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recurring Tasks</h1>
        <BtnPrimary onClick={() => { setForm(emptyForm); setShowForm(true); }}>New recurring task</BtnPrimary>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Template</th>
                <th className="text-left p-3">Schedule</th>
                <th className="text-left p-3">Team</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks?.map((task) => (
                <tr key={task.id} className="border-t">
                  <td className="p-3 font-medium">{task.name}</td>
                  <td className="p-3">{task.titleTemplate}</td>
                  <td className="p-3 font-mono text-xs">{task.rrule}</td>
                  <td className="p-3">{task.assignedTeam?.name || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {task.isActive ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <button className="text-primary text-xs hover:underline" onClick={() => openEdit(task)}>Edit</button>
                    <button className="text-xs hover:underline" onClick={() => toggleMutation.mutate({ id: task.id, isActive: !task.isActive })}>
                      {task.isActive ? 'Pause' : 'Resume'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New recurring task" wide>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, assignedTeamId: form.assignedTeamId || undefined }); }} className="space-y-4">
          <FormFields />
          <div className="flex gap-2 justify-end">
            <BtnSecondary type="button" onClick={() => setShowForm(false)}>Cancel</BtnSecondary>
            <BtnPrimary type="submit" disabled={createMutation.isPending}>Create</BtnPrimary>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit recurring task" wide>
        <form onSubmit={(e) => { e.preventDefault(); if (editTask) updateMutation.mutate({ id: editTask.id, body: { ...form, assignedTeamId: form.assignedTeamId || undefined } }); }} className="space-y-4">
          <FormFields />
          <div className="flex gap-2 justify-end">
            <BtnSecondary type="button" onClick={() => setEditTask(null)}>Cancel</BtnSecondary>
            <BtnPrimary type="submit" disabled={updateMutation.isPending}>Save</BtnPrimary>
          </div>
        </form>
      </Modal>
    </div>
  );
}
