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
  authProvider: string;
  passwordLoginDisabled: boolean;
  jobTitle?: string | null;
  department?: string | null;
  location?: string | null;
  phone?: string | null;
  employeeNumber?: string | null;
  managerId?: string | null;
  manager?: { id: string; name: string; email: string } | null;
  roles: Array<{ role: { id: string; name: string; slug: string } }>;
  teamMemberships: Array<{ team: { id: string; name: string } }>;
}

interface Role { id: string; name: string; slug: string }

const AUTH_PROVIDERS = [
  { value: 'local', label: 'Local (password)' },
  { value: 'entra', label: 'Microsoft Entra ID' },
  { value: 'ldap', label: 'LDAP / Active Directory' },
];

export default function ManageUsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [filter, setFilter] = useState('');
  const [nonLoginOnly, setNonLoginOnly] = useState(false);

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

  const filtered = users?.filter((u) => {
    if (nonLoginOnly && u.isActive && !u.passwordLoginDisabled) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department?.toLowerCase().includes(q) ?? false) ||
      (u.jobTitle?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Users & Employees</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>Add user</BtnPrimary>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, email, department..." className="max-w-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nonLoginOnly} onChange={(e) => setNonLoginOnly(e.target.checked)} />
          Non-login employees only
        </label>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Department</th>
                  <th className="text-left p-3">Job title</th>
                  <th className="text-left p-3">Manager</th>
                  <th className="text-left p-3">Roles</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.department || '—'}</td>
                    <td className="p-3">{u.jobTitle || '—'}</td>
                    <td className="p-3">{u.manager?.name || '—'}</td>
                    <td className="p-3">{u.roles.map((r) => r.role.name).join(', ')}</td>
                    <td className="p-3">{u.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="p-3"><button className="text-primary text-sm hover:underline" onClick={() => setEditUser(u)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserFormModal key={showCreate ? 'create' : 'closed'} open={showCreate} onClose={() => setShowCreate(false)} title="Add user" roles={roles || []} users={users || []} ssoEnabled={ssoEnabled} onSubmit={(data) => createMutation.mutate(data)} loading={createMutation.isPending} />
      {editUser && (
        <UserFormModal key={editUser.id} open={!!editUser} onClose={() => setEditUser(null)} title="Edit user" roles={roles || []} users={users || []} initial={editUser} onSubmit={(data) => updateMutation.mutate({ id: editUser.id, body: data })} loading={updateMutation.isPending} isEdit />
      )}
    </div>
  );
}

function UserFormModal({
  open, onClose, title, roles, users, onSubmit, loading, initial, isEdit, ssoEnabled,
}: {
  open: boolean; onClose: () => void; title: string; roles: Role[]; users: UserRow[];
  onSubmit: (data: object) => void; loading: boolean; initial?: UserRow; isEdit?: boolean; ssoEnabled?: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roles.map((r) => r.role.id) || []);
  const [authProvider, setAuthProvider] = useState(initial?.authProvider || 'local');
  const [passwordLoginDisabled, setPasswordLoginDisabled] = useState(initial?.passwordLoginDisabled ?? false);
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle || '');
  const [department, setDepartment] = useState(initial?.department || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [employeeNumber, setEmployeeNumber] = useState(initial?.employeeNumber || '');
  const [managerId, setManagerId] = useState(initial?.managerId || '');

  const isLocal = authProvider === 'local';
  useEffect(() => { if (!isLocal) setPasswordLoginDisabled(true); }, [isLocal]);

  const toggleRole = (id: string) => setRoleIds((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);

  const employeeFields = {
    jobTitle: jobTitle || undefined,
    department: department || undefined,
    location: location || undefined,
    phone: phone || undefined,
    employeeNumber: employeeNumber || undefined,
    managerId: managerId || undefined,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      onSubmit({ name, isActive, roleIds, authProvider, passwordLoginDisabled: isLocal ? passwordLoginDisabled : true, ...employeeFields, managerId: managerId || null });
    } else {
      onSubmit({ name, email, password: isLocal ? password || undefined : undefined, roleIds, authProvider, passwordLoginDisabled: isLocal ? passwordLoginDisabled : true, ...employeeFields });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
          {!isEdit && <div><FieldLabel>Email</FieldLabel><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>}
          <div><FieldLabel>Job title</FieldLabel><TextInput value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></div>
          <div><FieldLabel>Department</FieldLabel><TextInput value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
          <div><FieldLabel>Location</FieldLabel><TextInput value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><FieldLabel>Phone</FieldLabel><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><FieldLabel>Employee number</FieldLabel><TextInput value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} /></div>
          <div><FieldLabel>Manager</FieldLabel>
            <SelectInput value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">—</option>
              {users.filter((u) => u.id !== initial?.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </SelectInput>
          </div>
        </div>
        <div><FieldLabel>Auth provider</FieldLabel>
          <SelectInput value={authProvider} onChange={(e) => setAuthProvider(e.target.value)}>
            {AUTH_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </SelectInput>
        </div>
        {isLocal && !isEdit && (
          <div><FieldLabel>Password</FieldLabel><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!passwordLoginDisabled} /></div>
        )}
        {isLocal && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={passwordLoginDisabled} onChange={(e) => setPasswordLoginDisabled(e.target.checked)} />
            Disable password login (non-login employee)
          </label>
        )}
        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        <div><FieldLabel>Roles</FieldLabel>
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
