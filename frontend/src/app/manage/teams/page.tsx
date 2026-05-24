'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, TextArea, SelectInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
  memberships: Array<{ user: { id: string; name: string; email: string }; isLead: boolean }>;
}

interface UserRow { id: string; name: string; email: string }

export default function ManageTeamsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null);
  const [addMemberTeam, setAddMemberTeam] = useState<TeamRow | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['manage-teams'],
    queryFn: () => api<TeamRow[]>('/manage/teams'),
  });

  const { data: users } = useQuery({
    queryKey: ['manage-users'],
    queryFn: () => api<UserRow[]>('/manage/users'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api('/manage/teams', { method: 'POST', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-teams'] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/manage/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-teams'] }); setEditTeam(null); },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId, isLead }: { teamId: string; userId: string; isLead?: boolean }) =>
      api(`/manage/teams/${teamId}/members/${userId}`, { method: 'POST', body: JSON.stringify({ isLead }), headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manage-teams'] }); setAddMemberTeam(null); },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      api(`/manage/teams/${teamId}/members/${userId}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() || '' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manage-teams'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teams</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>New team</BtnPrimary>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams?.map((team) => (
            <div key={team.id} className="bg-card rounded-xl border p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-lg">{team.name}</h2>
                  <p className="text-sm text-muted-foreground">{team.slug}</p>
                </div>
                <div className="flex gap-2">
                  {team.isDefault && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>}
                  <button className="text-xs text-primary hover:underline" onClick={() => setEditTeam(team)}>Edit</button>
                </div>
              </div>
              {team.description && <p className="text-sm">{team.description}</p>}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Members ({team.memberships.length})</span>
                  <button className="text-xs text-primary hover:underline" onClick={() => setAddMemberTeam(team)}>+ Add</button>
                </div>
                <ul className="space-y-1">
                  {team.memberships.map((m) => (
                    <li key={m.user.id} className="flex justify-between items-center text-sm bg-muted/50 rounded px-2 py-1">
                      <span>{m.user.name}{m.isLead ? ' (Lead)' : ''}</span>
                      <button className="text-red-600 text-xs hover:underline" onClick={() => removeMemberMutation.mutate({ teamId: team.id, userId: m.user.id })}>Remove</button>
                    </li>
                  ))}
                  {!team.memberships.length && <li className="text-sm text-muted-foreground">No members</li>}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamFormModal open={showCreate} onClose={() => setShowCreate(false)} title="New team" onSubmit={(d) => createMutation.mutate(d)} loading={createMutation.isPending} />
      {editTeam && (
        <TeamFormModal open={!!editTeam} onClose={() => setEditTeam(null)} title="Edit team"
          initial={{ name: editTeam.name, slug: editTeam.slug, description: editTeam.description || '' }}
          onSubmit={(d) => updateMutation.mutate({ id: editTeam.id, body: d })} loading={updateMutation.isPending} isEdit />
      )}
      {addMemberTeam && (
        <Modal open={!!addMemberTeam} onClose={() => setAddMemberTeam(null)} title={`Add member to ${addMemberTeam.name}`}>
          <AddMemberForm users={users || []} existingIds={addMemberTeam.memberships.map((m) => m.user.id)}
            onSubmit={(userId, isLead) => addMemberMutation.mutate({ teamId: addMemberTeam.id, userId, isLead })} />
        </Modal>
      )}
    </div>
  );
}

function TeamFormModal({ open, onClose, title, onSubmit, loading, initial, isEdit }: {
  open: boolean; onClose: () => void; title: string; onSubmit: (d: object) => void; loading: boolean;
  initial?: { name: string; slug: string; description: string }; isEdit?: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [description, setDescription] = useState(initial?.description || '');

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, slug, description }); }} className="space-y-4">
        <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><FieldLabel>Slug</FieldLabel><TextInput value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={isEdit} /></div>
        <div><FieldLabel>Description</FieldLabel><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="flex gap-2 justify-end">
          <BtnSecondary type="button" onClick={onClose}>Cancel</BtnSecondary>
          <BtnPrimary type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}

function AddMemberForm({ users, existingIds, onSubmit }: { users: UserRow[]; existingIds: string[]; onSubmit: (userId: string, isLead: boolean) => void }) {
  const [userId, setUserId] = useState('');
  const [isLead, setIsLead] = useState(false);
  const available = users.filter((u) => !existingIds.includes(u.id));
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (userId) onSubmit(userId, isLead); }} className="space-y-4">
      <div><FieldLabel>User</FieldLabel>
        <SelectInput value={userId} onChange={(e) => setUserId(e.target.value)} required>
          <option value="">Select user...</option>
          {available.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
        </SelectInput>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isLead} onChange={(e) => setIsLead(e.target.checked)} />Team lead</label>
      <BtnPrimary type="submit" disabled={!userId}>Add member</BtnPrimary>
    </form>
  );
}
