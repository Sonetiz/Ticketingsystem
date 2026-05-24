'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, SelectInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

interface SlaRule {
  id: string;
  name: string;
  priority: string | null;
  responseMinutes: number | null;
  resolutionMinutes: number | null;
  isActive: boolean;
}

const PRIORITIES = ['', 'normal', 'elevated', 'high', 'urgent', 'critical'];

export default function ManageSlaPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editRule, setEditRule] = useState<SlaRule | null>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['manage-sla'],
    queryFn: () => api<SlaRule[]>('/manage/sla-rules'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['manage-sla'] });

  const createMutation = useMutation({
    mutationFn: (body: object) => api('/manage/sla-rules', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidate(); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/manage/sla-rules/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidate(); setEditRule(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/manage/sla-rules/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: invalidate,
  });

  const toggleActive = (rule: SlaRule) => {
    updateMutation.mutate({ id: rule.id, body: { isActive: !rule.isActive } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SLA Rules</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>New rule</BtnPrimary>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Response (min)</th>
                <th className="text-left p-3">Resolution (min)</th>
                <th className="text-left p-3">Active</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules?.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.priority || 'All'}</td>
                  <td className="p-3">{r.responseMinutes ?? '—'}</td>
                  <td className="p-3">{r.resolutionMinutes ?? '—'}</td>
                  <td className="p-3">
                    <button className={`text-xs px-2 py-0.5 rounded ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`} onClick={() => toggleActive(r)}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3 space-x-2">
                    <button className="text-primary text-sm hover:underline" onClick={() => setEditRule(r)}>Edit</button>
                    <button className="text-red-600 text-sm hover:underline" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(r.id); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlaFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />

      {editRule && (
        <SlaFormModal
          open
          onClose={() => setEditRule(null)}
          initial={editRule}
          onSubmit={(data) => updateMutation.mutate({ id: editRule.id, body: data })}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function SlaFormModal({ open, onClose, initial, onSubmit, loading }: {
  open: boolean; onClose: () => void; initial?: SlaRule;
  onSubmit: (data: object) => void; loading: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [priority, setPriority] = useState(initial?.priority || '');
  const [responseMinutes, setResponseMinutes] = useState(initial?.responseMinutes?.toString() || '');
  const [resolutionMinutes, setResolutionMinutes] = useState(initial?.resolutionMinutes?.toString() || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit SLA rule' : 'New SLA rule'}>
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          priority: priority || undefined,
          responseMinutes: responseMinutes ? parseInt(responseMinutes, 10) : undefined,
          resolutionMinutes: resolutionMinutes ? parseInt(resolutionMinutes, 10) : undefined,
          isActive,
        });
      }} className="space-y-4">
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div>
          <FieldLabel>Priority</FieldLabel>
          <SelectInput value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p || 'All priorities'}</option>)}
          </SelectInput>
        </div>
        <div><FieldLabel>Response (minutes)</FieldLabel><TextInput type="number" value={responseMinutes} onChange={(e) => setResponseMinutes(e.target.value)} /></div>
        <div><FieldLabel>Resolution (minutes)</FieldLabel><TextInput type="number" value={resolutionMinutes} onChange={(e) => setResolutionMinutes(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
