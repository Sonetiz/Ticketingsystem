'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function ManageTablePage({ title, endpoint, columns }: {
  title: string;
  endpoint: string;
  columns: Array<{ key: string; label: string }>;
}) {
  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => api<Array<Record<string, unknown>>>(endpoint),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="text-left p-3">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map((row, i) => (
                <tr key={i} className="border-t">
                  {columns.map((c) => (
                    <td key={c.key} className="p-3">
                      {typeof row[c.key] === 'object' ? JSON.stringify(row[c.key]) : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ManageRolesPage() {
  return <ManageTablePage title="Roles" endpoint="/manage/roles" columns={[{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }]} />;
}
