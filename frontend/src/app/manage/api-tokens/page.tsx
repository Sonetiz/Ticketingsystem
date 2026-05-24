'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Modal, FieldLabel, TextInput, SelectInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

interface ApiToken {
  id: string;
  name: string;
  userId: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

interface User { id: string; name: string; email: string }
interface Permission { id: string; slug: string; name: string }

export default function ManageApiTokensPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => api<ApiToken[]>('/manage/api-tokens'),
  });

  const { data: users } = useQuery({
    queryKey: ['manage-users'],
    queryFn: () => api<User[]>('/manage/users'),
  });

  const { data: permissions } = useQuery({
    queryKey: ['manage-permissions'],
    queryFn: () => api<Permission[]>('/manage/permissions'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api(`/manage/api-tokens/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api<{ token: string }>('/manage/api-tokens', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      setShowCreate(false);
      setCreatedToken(data.token);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">API Tokens</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>Create token</BtnPrimary>
      </div>

      {createdToken && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 rounded-xl p-4">
          <p className="font-medium text-sm">Copy this token now — it will not be shown again:</p>
          <code className="block mt-2 p-2 bg-background rounded text-xs break-all">{createdToken}</code>
          <button className="text-sm text-primary mt-2 hover:underline" onClick={() => setCreatedToken(null)}>Dismiss</button>
        </div>
      )}

      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Permissions</th>
                <th className="text-left p-3">Last Used</th>
                <th className="text-left p-3">Created</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens?.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.permissions.join(', ')}</td>
                  <td className="p-3">{t.lastUsedAt ? formatDate(t.lastUsedAt) : 'Never'}</td>
                  <td className="p-3">{formatDate(t.createdAt)}</td>
                  <td className="p-3">
                    <button className="text-red-600 text-sm hover:underline" onClick={() => { if (confirm('Revoke this token?')) revokeMutation.mutate(t.id); }}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tokens?.length && <p className="p-4 text-center text-muted-foreground">No API tokens yet</p>}
        </div>
      )}

      {showCreate && users && permissions && (
        <CreateTokenModal
          users={users}
          permissions={permissions}
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateTokenModal({ users, permissions, onClose, onSubmit, loading }: {
  users: User[]; permissions: Permission[];
  onClose: () => void; onSubmit: (data: object) => void; loading: boolean;
}) {
  const [userId, setUserId] = useState(users[0]?.id || '');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  return (
    <Modal open onClose={onClose} title="Create API token" wide>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ userId, name, permissions: Array.from(selected) }); }} className="space-y-4">
        <div>
          <FieldLabel>User</FieldLabel>
          <SelectInput value={userId} onChange={(e) => setUserId(e.target.value)} required>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </SelectInput>
        </div>
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required placeholder="Integration name" /></div>
        <div>
          <FieldLabel>Permissions</FieldLabel>
          <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
            {permissions.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.has(p.slug)} onChange={() => toggle(p.slug)} />
                <span className="font-mono text-xs">{p.slug}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading || selected.size === 0}>{loading ? 'Creating...' : 'Create'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
