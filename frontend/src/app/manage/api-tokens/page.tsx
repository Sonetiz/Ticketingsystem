'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function ManageApiTokensPage() {
  const { data: tokens, isLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => api<Array<{ id: string; name: string; permissions: string[]; lastUsedAt: string | null; createdAt: string }>>('/manage/api-tokens'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">API Tokens</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Permissions</th>
                <th className="text-left p-3">Last Used</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {tokens?.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.permissions.join(', ')}</td>
                  <td className="p-3">{t.lastUsedAt ? formatDate(t.lastUsedAt) : 'Never'}</td>
                  <td className="p-3">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tokens?.length && <p className="p-4 text-center text-muted-foreground">No API tokens yet</p>}
        </div>
      )}
    </div>
  );
}
