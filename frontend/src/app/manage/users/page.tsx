'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ManageUsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['manage-users'],
    queryFn: () => api<Array<{ id: string; email: string; name: string; isActive: boolean; roles: Array<{ role: { name: string } }> }>>('/manage/users'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Roles</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.roles.map((r) => r.role.name).join(', ')}</td>
                  <td className="p-3">{u.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
