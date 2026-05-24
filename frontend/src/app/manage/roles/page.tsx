'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, TextArea, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

interface Role {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissions: Array<{ permission: { id: string; slug: string; name: string } }>;
  _count: { users: number };
}

interface Permission {
  id: string;
  slug: string;
  name: string;
}

const BUILTIN_SLUGS = new Set(['super_admin', 'system_admin', 'agent', 'requester']);

function groupPermissions(perms: Permission[]) {
  const groups: Record<string, Permission[]> = {};
  for (const p of perms) {
    const prefix = p.slug.includes('.') ? p.slug.split('.')[0] : 'other';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(p);
  }
  return groups;
}

export default function ManageRolesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [permRole, setPermRole] = useState<Role | null>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['manage-roles'],
    queryFn: () => api<Role[]>('/manage/roles'),
  });

  const { data: permissions } = useQuery({
    queryKey: ['manage-permissions'],
    queryFn: () => api<Permission[]>('/manage/permissions'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['manage-roles'] });

  const createMutation = useMutation({
    mutationFn: (body: object) => api('/manage/roles', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidate(); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/manage/roles/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidate(); setEditRole(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/manage/roles/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: invalidate,
  });

  const permMutation = useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      api(`/manage/roles/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionIds }), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { invalidate(); setPermRole(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>New role</BtnPrimary>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Users</th>
                <th className="text-left p-3">Permissions</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles?.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 font-mono text-xs">{r.slug}</td>
                  <td className="p-3">{r._count.users}</td>
                  <td className="p-3">{r.permissions.length}</td>
                  <td className="p-3 space-x-2">
                    <button className="text-primary text-sm hover:underline" onClick={() => setEditRole(r)}>Edit</button>
                    <button className="text-primary text-sm hover:underline" onClick={() => setPermRole(r)}>Permissions</button>
                    {!BUILTIN_SLUGS.has(r.slug) && (
                      <button
                        className="text-red-600 text-sm hover:underline"
                        onClick={() => { if (confirm('Delete this role?')) deleteMutation.mutate(r.id); }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RoleFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New role"
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />

      {editRole && (
        <RoleFormModal
          open
          onClose={() => setEditRole(null)}
          title="Edit role"
          initial={{ name: editRole.name, description: editRole.description || '' }}
          onSubmit={(data) => updateMutation.mutate({ id: editRole.id, body: data })}
          loading={updateMutation.isPending}
          isEdit
        />
      )}

      {permRole && permissions && (
        <PermissionsModal
          role={permRole}
          permissions={permissions}
          onClose={() => setPermRole(null)}
          onSave={(permissionIds) => permMutation.mutate({ id: permRole.id, permissionIds })}
          loading={permMutation.isPending}
        />
      )}
    </div>
  );
}

function RoleFormModal({
  open, onClose, title, onSubmit, loading, initial, isEdit,
}: {
  open: boolean; onClose: () => void; title: string;
  onSubmit: (data: object) => void; loading: boolean;
  initial?: { name: string; description: string }; isEdit?: boolean;
}) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(isEdit ? { name, description } : { slug, name, description }); }} className="space-y-4">
        {!isEdit && (
          <div><FieldLabel>Slug</FieldLabel><TextInput value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9_]+" /></div>
        )}
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><FieldLabel>Description</FieldLabel><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}

function PermissionsModal({
  role, permissions, onClose, onSave, loading,
}: {
  role: Role; permissions: Permission[]; onClose: () => void;
  onSave: (ids: string[]) => void; loading: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(role.permissions.map((p) => p.permission.id)),
  );
  const groups = groupPermissions(permissions);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Modal open onClose={onClose} title={`Permissions — ${role.name}`} wide>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([group, perms]) => (
          <div key={group}>
            <h3 className="font-medium text-sm capitalize mb-2">{group}</h3>
            <div className="space-y-1 pl-2">
              {perms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <span className="font-mono text-xs">{p.slug}</span>
                  <span className="text-muted-foreground">— {p.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
        <BtnPrimary onClick={() => onSave(Array.from(selected))} disabled={loading}>
          {loading ? 'Saving...' : 'Save permissions'}
        </BtnPrimary>
      </div>
    </Modal>
  );
}
