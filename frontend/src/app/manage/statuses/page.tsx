'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, SelectInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

type Tab = 'statuses' | 'priorities';

interface StatusRow {
  slug: string;
  name: string;
  sortOrder: number;
  isClosed: boolean;
  isHold: boolean;
  isActive: boolean;
  color: string | null;
}

interface PriorityRow {
  slug: string;
  name: string;
  sortOrder: number;
  color: string | null;
}

export default function ManageStatusesPage() {
  const [tab, setTab] = useState<Tab>('statuses');
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editStatus, setEditStatus] = useState<StatusRow | null>(null);
  const [editPriority, setEditPriority] = useState<PriorityRow | null>(null);

  const { data: statuses, isLoading: loadingStatuses } = useQuery({
    queryKey: ['manage-statuses'],
    queryFn: () => api<StatusRow[]>('/manage/statuses'),
  });

  const { data: priorities, isLoading: loadingPriorities } = useQuery({
    queryKey: ['manage-priorities'],
    queryFn: () => api<PriorityRow[]>('/manage/priorities'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['manage-statuses'] });
    queryClient.invalidateQueries({ queryKey: ['manage-priorities'] });
  };

  const saveStatus = useMutation({
    mutationFn: (body: object) => api('/manage/statuses', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidate(); setShowCreate(false); setEditStatus(null); },
  });

  const deleteStatus = useMutation({
    mutationFn: (slug: string) => api(`/manage/statuses/${slug}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: invalidate,
  });

  const savePriority = useMutation({
    mutationFn: (body: object) => api('/manage/priorities', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidate(); setShowCreate(false); setEditPriority(null); },
  });

  const deletePriority = useMutation({
    mutationFn: (slug: string) => api(`/manage/priorities/${slug}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: invalidate,
  });

  const reorder = (items: StatusRow[] | PriorityRow[], index: number, direction: -1 | 1, type: Tab) => {
    const swap = items[index + direction];
    if (!swap) return;
    const body = { slug: items[index].slug, sortOrder: swap.sortOrder };
    if (type === 'statuses') saveStatus.mutate(body);
    else savePriority.mutate(body);
    const swapBody = { slug: swap.slug, sortOrder: items[index].sortOrder };
    if (type === 'statuses') saveStatus.mutate(swapBody);
    else savePriority.mutate(swapBody);
  };

  const isLoading = tab === 'statuses' ? loadingStatuses : loadingPriorities;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Statuses & Priorities</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>
          New {tab === 'statuses' ? 'status' : 'priority'}
        </BtnPrimary>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['statuses', 'priorities'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? <p>Loading...</p> : tab === 'statuses' ? (
        <ConfigTable
          rows={statuses || []}
          columns={['Order', 'Name', 'Slug', 'Closed', 'Hold', 'Actions']}
          renderRow={(s: StatusRow, i) => (
            <tr key={s.slug} className="border-t">
              <td className="p-3">
                <div className="flex items-center gap-1">
                  <button className="text-xs px-1" disabled={i === 0} onClick={() => reorder(statuses!, i, -1, 'statuses')}>↑</button>
                  <button className="text-xs px-1" disabled={i === (statuses?.length || 0) - 1} onClick={() => reorder(statuses!, i, 1, 'statuses')}>↓</button>
                  {s.sortOrder}
                </div>
              </td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: (s.color || '#888') + '20', color: s.color || '#888' }}>
                  {s.name}
                </span>
              </td>
              <td className="p-3 font-mono text-xs">{s.slug}</td>
              <td className="p-3">{s.isClosed ? 'Yes' : 'No'}</td>
              <td className="p-3">{s.isHold ? 'Yes' : 'No'}</td>
              <td className="p-3 space-x-2">
                <button className="text-primary text-sm hover:underline" onClick={() => setEditStatus(s)}>Edit</button>
                <button className="text-red-600 text-sm hover:underline" onClick={() => { if (confirm('Delete?')) deleteStatus.mutate(s.slug); }}>Delete</button>
              </td>
            </tr>
          )}
        />
      ) : (
        <ConfigTable
          rows={priorities || []}
          columns={['Order', 'Name', 'Slug', 'Actions']}
          renderRow={(p: PriorityRow, i) => (
            <tr key={p.slug} className="border-t">
              <td className="p-3">
                <div className="flex items-center gap-1">
                  <button className="text-xs px-1" disabled={i === 0} onClick={() => reorder(priorities!, i, -1, 'priorities')}>↑</button>
                  <button className="text-xs px-1" disabled={i === (priorities?.length || 0) - 1} onClick={() => reorder(priorities!, i, 1, 'priorities')}>↓</button>
                  {p.sortOrder}
                </div>
              </td>
              <td className="p-3">
                <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: (p.color || '#888') + '20', color: p.color || '#888' }}>
                  {p.name}
                </span>
              </td>
              <td className="p-3 font-mono text-xs">{p.slug}</td>
              <td className="p-3 space-x-2">
                <button className="text-primary text-sm hover:underline" onClick={() => setEditPriority(p)}>Edit</button>
                <button className="text-red-600 text-sm hover:underline" onClick={() => { if (confirm('Delete?')) deletePriority.mutate(p.slug); }}>Delete</button>
              </td>
            </tr>
          )}
        />
      )}

      {(showCreate || editStatus) && tab === 'statuses' && (
        <StatusFormModal
          open
          onClose={() => { setShowCreate(false); setEditStatus(null); }}
          initial={editStatus || undefined}
          onSubmit={(data) => saveStatus.mutate(data)}
          loading={saveStatus.isPending}
        />
      )}

      {(showCreate || editPriority) && tab === 'priorities' && (
        <PriorityFormModal
          open
          onClose={() => { setShowCreate(false); setEditPriority(null); }}
          initial={editPriority || undefined}
          onSubmit={(data) => savePriority.mutate(data)}
          loading={savePriority.isPending}
        />
      )}
    </div>
  );
}

function ConfigTable<T>({ rows, columns, renderRow }: { rows: T[]; columns: string[]; renderRow: (row: T, i: number) => React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>{columns.map((c) => <th key={c} className="text-left p-3">{c}</th>)}</tr>
        </thead>
        <tbody>{rows.map((r, i) => renderRow(r, i))}</tbody>
      </table>
    </div>
  );
}

function StatusFormModal({ open, onClose, initial, onSubmit, loading }: {
  open: boolean; onClose: () => void; initial?: StatusRow;
  onSubmit: (data: object) => void; loading: boolean;
}) {
  const [slug, setSlug] = useState(initial?.slug || '');
  const [name, setName] = useState(initial?.name || '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [color, setColor] = useState(initial?.color || '#6366f1');
  const [isClosed, setIsClosed] = useState(initial?.isClosed ?? false);
  const [isHold, setIsHold] = useState(initial?.isHold ?? false);

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit status' : 'New status'}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ slug, name, sortOrder, color, isClosed, isHold }); }} className="space-y-4">
        <div><FieldLabel>Slug</FieldLabel><TextInput value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!!initial} /></div>
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><FieldLabel>Sort order</FieldLabel><TextInput type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10))} /></div>
        <div><FieldLabel>Color</FieldLabel><TextInput type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} /> Closed status</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isHold} onChange={(e) => setIsHold(e.target.checked)} /> Hold status</label>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}

function PriorityFormModal({ open, onClose, initial, onSubmit, loading }: {
  open: boolean; onClose: () => void; initial?: PriorityRow;
  onSubmit: (data: object) => void; loading: boolean;
}) {
  const [slug, setSlug] = useState(initial?.slug || '');
  const [name, setName] = useState(initial?.name || '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [color, setColor] = useState(initial?.color || '#6366f1');

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit priority' : 'New priority'}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ slug, name, sortOrder, color }); }} className="space-y-4">
        <div><FieldLabel>Slug</FieldLabel><TextInput value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!!initial} /></div>
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><FieldLabel>Sort order</FieldLabel><TextInput type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10))} /></div>
        <div><FieldLabel>Color</FieldLabel><TextInput type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
