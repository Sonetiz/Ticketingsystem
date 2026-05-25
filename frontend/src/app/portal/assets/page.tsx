'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assets,
  employees,
  type AssetItem,
  type AssetPayload,
  type ImportResult,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { BtnPrimary, BtnSecondary, FieldLabel, Modal, SelectInput, TextArea, TextInput } from '@/components/ui/modal';
import { toast } from '@/lib/toast';

const STATUSES = ['in_use', 'in_storage', 'maintenance', 'retired', 'lost'];
const LIFECYCLE = ['planning', 'deployed', 'retired'];

interface AssetFormState {
  name: string;
  assetType: string;
  identifier: string;
  status: string;
  lifecycleStage: string;
  location: string;
  vendor: string;
  model: string;
  serialNumber: string;
  ownerId: string;
  primaryUserId: string;
  purchaseDate: string;
  warrantyEndsAt: string;
  notes: string;
}

const emptyForm: AssetFormState = {
  name: '',
  assetType: '',
  identifier: '',
  status: 'in_use',
  lifecycleStage: 'deployed',
  location: '',
  vendor: '',
  model: '',
  serialNumber: '',
  ownerId: '',
  primaryUserId: '',
  purchaseDate: '',
  warrantyEndsAt: '',
  notes: '',
};

function toPayload(form: AssetFormState): AssetPayload {
  return {
    name: form.name,
    assetType: form.assetType,
    identifier: form.identifier || null,
    status: form.status,
    lifecycleStage: form.lifecycleStage,
    location: form.location || null,
    vendor: form.vendor || null,
    model: form.model || null,
    serialNumber: form.serialNumber || null,
    ownerId: form.ownerId || null,
    primaryUserId: form.primaryUserId || null,
    purchaseDate: form.purchaseDate || null,
    warrantyEndsAt: form.warrantyEndsAt || null,
    notes: form.notes || null,
  };
}

function assetToForm(asset: AssetItem): AssetFormState {
  return {
    name: asset.name,
    assetType: asset.assetType,
    identifier: asset.identifier ?? '',
    status: asset.status,
    lifecycleStage: asset.lifecycleStage,
    location: asset.location ?? '',
    vendor: asset.vendor ?? '',
    model: asset.model ?? '',
    serialNumber: asset.serialNumber ?? '',
    ownerId: asset.ownerId ?? '',
    primaryUserId: asset.primaryUserId ?? '',
    purchaseDate: asset.purchaseDate?.slice(0, 10) ?? '',
    warrantyEndsAt: asset.warrantyEndsAt?.slice(0, 10) ?? '',
    notes: asset.notes ?? '',
  };
}

export default function AssetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ q: '', status: '', lifecycleStage: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [form, setForm] = useState<AssetFormState>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => assets.list(filters),
  });

  const { data: employeeList } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employees.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => assets.create(toPayload(form)),
    onSuccess: () => {
      toast.success('Asset created');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingAsset) throw new Error('No asset selected');
      return assets.update(editingAsset.id, toPayload(form));
    },
    onSuccess: () => {
      toast.success('Asset updated');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setEditingAsset(null);
      setForm(emptyForm);
    },
  });

  const exportCsv = () => {
    if (!data?.length) return;
    const headers = ['name', 'assetType', 'identifier', 'serialNumber', 'status', 'lifecycleStage', 'location', 'vendor', 'model'];
    const rows = data.map((a) =>
      [a.name, a.assetType, a.identifier ?? '', a.serialNumber ?? '', a.status, a.lifecycleStage, a.location ?? '', a.vendor ?? '', a.model ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assets-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <div className="flex flex-wrap gap-2">
          <BtnSecondary onClick={exportCsv}>Export CSV</BtnSecondary>
          <BtnSecondary onClick={() => setShowImport(true)}>Import CSV</BtnSecondary>
          <BtnPrimary onClick={() => { setForm(emptyForm); setShowCreate(true); }}>New asset</BtnPrimary>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TextInput
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Search..."
          className="max-w-xs"
        />
        <SelectInput value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </SelectInput>
        <SelectInput value={filters.lifecycleStage} onChange={(e) => setFilters({ ...filters, lifecycleStage: e.target.value })}>
          <option value="">All lifecycle</option>
          {LIFECYCLE.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectInput>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Owner</th>
                  <th className="text-left p-3 font-medium">Primary user</th>
                  <th className="text-left p-3 font-medium">Location</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((asset) => (
                  <tr key={asset.id} className="border-t border-border hover:bg-muted/50">
                    <td className="p-3">
                      <Link href={`/portal/assets/${asset.id}`} className="text-primary hover:underline font-medium">
                        {asset.name}
                      </Link>
                    </td>
                    <td className="p-3 capitalize">{asset.assetType}</td>
                    <td className="p-3 capitalize">{asset.status.replace(/_/g, ' ')}</td>
                    <td className="p-3">{asset.owner?.name ?? '—'}</td>
                    <td className="p-3">{asset.primaryUser?.name ?? '—'}</td>
                    <td className="p-3">{asset.location || '—'}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(asset.updatedAt)}</td>
                    <td className="p-3 text-right space-x-2">
                      <button type="button" onClick={() => router.push(`/portal/assets/${asset.id}`)} className="text-xs text-primary hover:underline">View</button>
                      <button type="button" onClick={() => { setForm(assetToForm(asset)); setEditingAsset(asset); }} className="text-xs text-primary hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data?.length && <p className="p-8 text-center text-muted-foreground">No assets found</p>}
        </div>
      )}

      <AssetFormModal open={showCreate} title="Create asset" form={form} employees={employeeList ?? []} pending={createMutation.isPending} submitLabel="Create" onClose={() => setShowCreate(false)} onChange={setForm} onSubmit={() => createMutation.mutate()} />
      <AssetFormModal open={!!editingAsset} title="Edit asset" form={form} employees={employeeList ?? []} pending={updateMutation.isPending} submitLabel="Save" onClose={() => setEditingAsset(null)} onChange={setForm} onSubmit={() => updateMutation.mutate()} />
      <ImportCsvModal open={showImport} onClose={() => setShowImport(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['assets'] }); setShowImport(false); }} />
    </div>
  );
}

function AssetFormModal({
  open, title, form, employees, pending, submitLabel, onClose, onChange, onSubmit,
}: {
  open: boolean; title: string; form: AssetFormState;
  employees: Array<{ id: string; name: string; email: string }>;
  pending: boolean; submitLabel: string; onClose: () => void;
  onChange: (form: AssetFormState) => void; onSubmit: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} required /></div>
          <div><FieldLabel>Type</FieldLabel><TextInput value={form.assetType} onChange={(e) => onChange({ ...form, assetType: e.target.value })} placeholder="hardware, server, service..." required /></div>
          <div><FieldLabel>Identifier</FieldLabel><TextInput value={form.identifier} onChange={(e) => onChange({ ...form, identifier: e.target.value })} /></div>
          <div><FieldLabel>Serial number</FieldLabel><TextInput value={form.serialNumber} onChange={(e) => onChange({ ...form, serialNumber: e.target.value })} /></div>
          <div><FieldLabel>Status</FieldLabel><SelectInput value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</SelectInput></div>
          <div><FieldLabel>Lifecycle</FieldLabel><SelectInput value={form.lifecycleStage} onChange={(e) => onChange({ ...form, lifecycleStage: e.target.value })}>{LIFECYCLE.map((s) => <option key={s} value={s}>{s}</option>)}</SelectInput></div>
          <div><FieldLabel>Location</FieldLabel><TextInput value={form.location} onChange={(e) => onChange({ ...form, location: e.target.value })} /></div>
          <div><FieldLabel>Vendor</FieldLabel><TextInput value={form.vendor} onChange={(e) => onChange({ ...form, vendor: e.target.value })} /></div>
          <div><FieldLabel>Model</FieldLabel><TextInput value={form.model} onChange={(e) => onChange({ ...form, model: e.target.value })} /></div>
          <div><FieldLabel>Owner</FieldLabel><SelectInput value={form.ownerId} onChange={(e) => onChange({ ...form, ownerId: e.target.value })}><option value="">—</option>{employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</SelectInput></div>
          <div><FieldLabel>Primary user</FieldLabel><SelectInput value={form.primaryUserId} onChange={(e) => onChange({ ...form, primaryUserId: e.target.value })}><option value="">—</option>{employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</SelectInput></div>
          <div><FieldLabel>Purchase date</FieldLabel><TextInput type="date" value={form.purchaseDate} onChange={(e) => onChange({ ...form, purchaseDate: e.target.value })} /></div>
          <div><FieldLabel>Warranty ends</FieldLabel><TextInput type="date" value={form.warrantyEndsAt} onChange={(e) => onChange({ ...form, warrantyEndsAt: e.target.value })} /></div>
        </div>
        <div><FieldLabel>Notes</FieldLabel><TextArea value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} className="min-h-24" /></div>
        <div className="flex justify-end gap-2">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={pending}>{submitLabel}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}

function ImportCsvModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);

  const runImport = async (dryRun: boolean) => {
    if (!file) return;
    setPending(true);
    try {
      const result = await assets.importCsv(file, dryRun);
      setPreview(result);
      if (!dryRun) {
        toast.success(`Import complete: ${result.created} created, ${result.updated} updated`);
        onSuccess();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import assets from CSV" wide>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Required columns: name, assetType. Optional: identifier, serialNumber, status, lifecycleStage, location, ownerEmail, primaryUserEmail, serviceSlug, purchaseDate, warrantyEndsAt, notes.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} />
        {preview && (
          <div className="rounded-lg border border-border p-3 text-sm space-y-1">
            <p>Created: {preview.created} · Updated: {preview.updated} · Errors: {preview.errors.length}</p>
            {preview.errors.slice(0, 5).map((e) => (
              <p key={e.row} className="text-red-600">Row {e.row}: {e.message}</p>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnSecondary type="button" disabled={!file || pending} onClick={() => runImport(true)}>Dry run</BtnSecondary>
          <BtnPrimary type="button" disabled={!file || pending} onClick={() => runImport(false)}>Import</BtnPrimary>
        </div>
      </div>
    </Modal>
  );
}
