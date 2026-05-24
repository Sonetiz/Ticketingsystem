'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ManageStatusesPage() {
  const { data: statuses, isLoading } = useQuery({
    queryKey: ['manage-statuses'],
    queryFn: () => api<Array<{ slug: string; name: string; sortOrder: number; isClosed: boolean; isHold: boolean; color: string }>>('/manage/statuses'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ticket Statuses</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Closed</th>
                <th className="text-left p-3">Hold</th>
              </tr>
            </thead>
            <tbody>
              {statuses?.map((s) => (
                <tr key={s.slug} className="border-t">
                  <td className="p-3">{s.sortOrder}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: s.color + '20', color: s.color }}>
                      {s.name}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{s.slug}</td>
                  <td className="p-3">{s.isClosed ? 'Yes' : 'No'}</td>
                  <td className="p-3">{s.isHold ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
