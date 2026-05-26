'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';
import { JsonTextarea } from '@/components/ui/json-textarea';

interface SystemSetting {
  id: string;
  key: string;
  value: object;
}

export default function ManageSettingsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editSetting, setEditSetting] = useState<SystemSetting | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['manage-settings'],
    queryFn: () => api<SystemSetting[]>('/manage/settings'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['manage-settings'] });

  const accessAllowlistSetting = settings?.find((s) => s.key === 'access.allowlist');
  const accessAllowlistValue = (accessAllowlistSetting?.value as { enabled?: boolean; ips?: string[]; hosts?: string[] } | undefined) ?? {};
  const [allowlistEnabled, setAllowlistEnabled] = useState<boolean>(false);
  const [allowlistIps, setAllowlistIps] = useState<string>('');
  const [allowlistHosts, setAllowlistHosts] = useState<string>('');
  const [allowlistDirty, setAllowlistDirty] = useState(false);

  useEffect(() => {
    if (allowlistDirty) return;
    setAllowlistEnabled(accessAllowlistValue.enabled === true);
    setAllowlistIps((accessAllowlistValue.ips || []).join('\n'));
    setAllowlistHosts((accessAllowlistValue.hosts || []).join('\n'));
  }, [accessAllowlistValue.enabled, accessAllowlistValue.hosts, accessAllowlistValue.ips, allowlistDirty]);

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: object }) =>
      api(`/manage/settings/${encodeURIComponent(key)}`, {
        method: 'POST',
        body: JSON.stringify(value),
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      }),
    onSuccess: () => { invalidate(); setShowCreate(false); setEditSetting(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => api(`/manage/settings/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
    }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>New setting</BtnPrimary>
      </div>
      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Access allowlist</h2>
          <p className="text-sm text-muted-foreground">
            When enabled, the backend will only accept requests from allowed IPs/CIDRs or allowed Hosts.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowlistEnabled}
            onChange={(e) => {
              setAllowlistDirty(true);
              setAllowlistEnabled(e.target.checked);
            }}
          />
          Enable allowlist enforcement
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel>Allowed IPs / CIDRs (one per line)</FieldLabel>
            <textarea
              value={allowlistIps}
              onChange={(e) => {
                setAllowlistDirty(true);
                setAllowlistIps(e.target.value);
              }}
              rows={6}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-xs"
              placeholder={"203.0.113.10\n203.0.113.0/24"}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Allowed Hosts (one per line)</FieldLabel>
            <textarea
              value={allowlistHosts}
              onChange={(e) => {
                setAllowlistDirty(true);
                setAllowlistHosts(e.target.value);
              }}
              rows={6}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-xs"
              placeholder={"helpdesk.example.com\ninternal.tickets.example.com"}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <BtnPrimary
            onClick={() => {
              const ips = allowlistIps
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);
              const hosts = allowlistHosts
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);
              saveMutation.mutate({
                key: 'access.allowlist',
                value: { enabled: allowlistEnabled, ips, hosts },
              });
              setAllowlistDirty(false);
            }}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save allowlist'}
          </BtnPrimary>
        </div>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Key</th>
                <th className="text-left p-3">Value</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings?.map((s) => (
                <tr key={s.key} className="border-t">
                  <td className="p-3 font-mono text-xs">{s.key}</td>
                  <td className="p-3 font-mono text-xs max-w-md truncate">{JSON.stringify(s.value)}</td>
                  <td className="p-3 space-x-2">
                    <button className="text-primary text-sm hover:underline" onClick={() => setEditSetting(s)}>Edit</button>
                    <button className="text-red-600 text-sm hover:underline" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s.key); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!settings?.length && <p className="p-4 text-center text-muted-foreground">No system settings</p>}
        </div>
      )}

      {(showCreate || editSetting) && (
        <SettingFormModal
          initial={editSetting || undefined}
          onClose={() => { setShowCreate(false); setEditSetting(null); }}
          onSubmit={(key, value) => saveMutation.mutate({ key, value })}
          loading={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function SettingFormModal({ initial, onClose, onSubmit, loading }: {
  initial?: SystemSetting; onClose: () => void;
  onSubmit: (key: string, value: object) => void; loading: boolean;
}) {
  const [key, setKey] = useState(initial?.key || '');
  const [valueText, setValueText] = useState(JSON.stringify(initial?.value ?? {}, null, 2));
  const [parsed, setParsed] = useState<object | null>(initial?.value ?? {});
  const [error, setError] = useState('');

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit setting' : 'New setting'} wide>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!parsed) { setError('Invalid JSON'); return; }
        onSubmit(key, parsed);
      }} className="space-y-4">
        <div>
          <FieldLabel>Key</FieldLabel>
          <TextInput value={key} onChange={(e) => setKey(e.target.value)} required disabled={!!initial} />
        </div>
        <div>
          <FieldLabel>Value (JSON)</FieldLabel>
          <JsonTextarea value={valueText} onChange={(text, p) => { setValueText(text); setParsed(p); setError(''); }} />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
