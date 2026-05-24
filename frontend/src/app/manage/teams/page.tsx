'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ManageTeamsPage() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['manage-teams'],
    queryFn: () => api<Array<{ id: string; name: string; slug: string; isDefault: boolean; memberships: Array<{ user: { name: string } }> }>>('/manage/teams'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Teams</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams?.map((team) => (
            <div key={team.id} className="bg-card rounded-xl border p-5">
              <div className="flex justify-between">
                <h2 className="font-semibold">{team.name}</h2>
                {team.isDefault && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{team.slug}</p>
              <p className="text-sm mt-2">{team.memberships.length} members</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
