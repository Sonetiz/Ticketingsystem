'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken, getAuthConfig } from '@/lib/api';
import { Modal, FieldLabel, TextInput, SelectInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

interface UserRow {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: Array<{ role: { id: string; name: string; slug: string } }>;
  teamMemberships: Array<{ team: { id: string; name: string } }>;
}

interface Role { id: string; name: string; slug: string }

export default function ManageUsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['manage-users'],
    queryFn: () => api<UserRow[]>('/manage/users'),
  });

  const { data: roles } = useQuery({
    queryKey: ['manage-roles'],
    queryFn: () => api<Role[]>('/manage/roles'),
  });

  useEffect(() => { getAuthConfig().then((c) => setSsoEnabled(c.ssoEnabled)).catch(() => {}); }, []);

  const createMutation = useMutation({
    mutationFn: (body: object) => api('/manage/users', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-users'] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/manage/users/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-users'] }); setEditUser(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>Add user</BtnPrimary>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Roles</th>
                <th className="text-left p-3">Teams</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.roles.map((r) => r.role.name).join(', ')}</td>
                  <td className="p-3">{u.teamMemberships.map((t) => t.team.name).join(', ') || '—'}</td>
                  <td className="p-3">{u.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="p-3"><button className="text-primary text-sm hover:underline" onClick={() => setEditUser(u)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add user"
        roles={roles || []}
        ssoEnabled={ssoEnabled}
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />

      {editUser && (
        <UserFormModal
          open={!!editUser}
          onClose={() => setEditUser(null)}
          title="Edit user"
          roles={roles || []}
          initial={{ name: editUser.name, isActive: editUser.isActive, roleIds: editUser.roles.map((r) => r.role.id) }}
          onSubmit={(data) => updateMutation.mutate({ id: editUser.id, body: data })}
          loading={updateMutation.isPending}
          isEdit
        />
      )}
    </div>
  );
}

function UserFormModal({
  open, onClose, title, roles, onSubmit, loading, initial, isEdit, ssoEnabled,
}: {
  open: boolean; onClose: () => void; title: string; roles: Role[];
  onSubmit: (data: object) => void; loading: boolean; initial?: { name: string; isActive: boolean; roleIds: string[] };
  isEdit?: boolean; ssoEnabled?: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds || []);

  const toggleRole = (id: string) => {
    setRoleIds((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      onSubmit({ name, isActive, roleIds });
    } else {
      onSubmit({ name, email, password: password || undefined, roleIds });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        {!isEdit && (
          <>
            <div><FieldLabel>Email</FieldLabel><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div>
              <FieldLabel>Password {ssoEnabled ? '(optional for SSO users)' : ''}</FieldLabel>
              <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!ssoEnabled} />
            </div>
          </>
        )}
        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        <div>
          <FieldLabel>Roles</FieldLabel>
          <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
