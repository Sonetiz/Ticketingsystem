'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { software, type SoftwareLicense } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { BtnPrimary, BtnSecondary, FieldLabel, Modal, TextInput, TextArea } from '@/components/ui/modal';
import { toast } from '@/lib/toast';

interface LicenseForm {
  name: string;
  vendor: string;
  licenseKey: string;
  seatsTotal: string;
  expiryDate: string;
  notes: string;
}

const emptyForm: LicenseForm = {
  name: '',
  vendor: '',
  licenseKey: '',
  seatsTotal: '1',
  expiryDate: '',
  notes: '',
};

function toForm(lic: SoftwareLicense): LicenseForm {
  return {
    name: lic.name,
    vendor: lic.vendor ?? '',
    licenseKey: lic.licenseKey ?? '',
    seatsTotal: String(lic.seatsTotal),
    expiryDate: lic.expiryDate?.slice(0, 10) ?? '',
    notes: lic.notes ?? '',
  };
}

export default function ManageSoftwarePage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SoftwareLicense | null>(null);
  const [form, setForm] = useState<LicenseForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['software'],
    queryFn: software.list,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        vendor: form.vendor || undefined,
        licenseKey: form.licenseKey || undefined,
        seatsTotal: parseInt(form.seatsTotal, 10) || 1,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      };
      return editing ? software.update(editing.id, payload) : software.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'License updated' : 'License created');
      queryClient.invalidateQueries({ queryKey: ['software'] });
      setShowCreate(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => software.remove(id),
    onSuccess: () => {
      toast.success('License deleted');
      queryClient.invalidateQueries({ queryKey: ['software'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  const isExpiringSoon = (date?: string | null) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Software Licenses</h1>
        <BtnPrimary onClick={() => { setForm(emptyForm); setShowCreate(true); }}>Add license</BtnPrimary>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-left p-3">Seats</th>
                <th className="text-left p-3">Expiry</th>
                <th className="text-left p-3">Installations</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((lic) => {
                const used = lic.seatsUsed ?? 0;
                const pct = lic.seatsTotal ? Math.round((used / lic.seatsTotal) * 100) : 0;
                return (
                  <tr key={lic.id} className="border-t">
                    <td className="p-3 font-medium">{lic.name}</td>
                    <td className="p-3">{lic.vendor || '—'}</td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <span>{used} / {lic.seatsTotal}</span>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {lic.expiryDate ? (
                        <span className={isExpiringSoon(lic.expiryDate) ? 'text-amber-600 font-medium' : ''}>
                          {formatDate(lic.expiryDate)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3">{lic.installations?.length ?? 0}</td>
                    <td className="p-3 space-x-2">
                      <button className="text-primary text-sm hover:underline" onClick={() => { setEditing(lic); setForm(toForm(lic)); }}>Edit</button>
                      <button className="text-red-600 text-sm hover:underline" onClick={() => deleteMutation.mutate(lic.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data?.length && <p className="p-8 text-center text-muted-foreground">No licenses</p>}
        </div>
      )}

      <LicenseModal open={showCreate || !!editing} title={editing ? 'Edit license' : 'Add license'} form={form} pending={saveMutation.isPending} onClose={() => { setShowCreate(false); setEditing(null); }} onChange={setForm} onSubmit={() => saveMutation.mutate()} />
    </div>
  );
}

function LicenseModal({ open, title, form, pending, onClose, onChange, onSubmit }: {
  open: boolean; title: string; form: LicenseForm; pending: boolean;
  onClose: () => void; onChange: (f: LicenseForm) => void; onSubmit: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} required /></div>
        <div><FieldLabel>Vendor</FieldLabel><TextInput value={form.vendor} onChange={(e) => onChange({ ...form, vendor: e.target.value })} /></div>
        <div><FieldLabel>License key</FieldLabel><TextInput value={form.licenseKey} onChange={(e) => onChange({ ...form, licenseKey: e.target.value })} /></div>
        <div><FieldLabel>Seats total</FieldLabel><TextInput type="number" min={1} value={form.seatsTotal} onChange={(e) => onChange({ ...form, seatsTotal: e.target.value })} required /></div>
        <div><FieldLabel>Expiry date</FieldLabel><TextInput type="date" value={form.expiryDate} onChange={(e) => onChange({ ...form, expiryDate: e.target.value })} /></div>
        <div><FieldLabel>Notes</FieldLabel><TextArea value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} /></div>
        <div className="flex justify-end gap-2">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={pending}>Save</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
