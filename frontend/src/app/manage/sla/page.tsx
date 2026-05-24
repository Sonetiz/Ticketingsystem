'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ManageSlaPage() {
  const { data: rules, isLoading } = useQuery({
    queryKey: ['manage-sla'],
    queryFn: () => api<Array<{ name: string; priority: string; responseMinutes: number; resolutionMinutes: number; isActive: boolean }>>('/manage/sla-rules'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">SLA Rules</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Response (min)</th>
                <th className="text-left p-3">Resolution (min)</th>
                <th className="text-left p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {rules?.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.priority || 'All'}</td>
                  <td className="p-3">{r.responseMinutes}</td>
                  <td className="p-3">{r.resolutionMinutes}</td>
                  <td className="p-3">{r.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
