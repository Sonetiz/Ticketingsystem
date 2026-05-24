'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function ManageAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api<{ data: Array<{ id: string; action: string; entityType: string; entityId: string; source: string; createdAt: string; actor: { name: string } | null }> }>('/manage/audit-logs'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Actor</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Entity</th>
                <th className="text-left p-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3 text-xs">{formatDate(log.createdAt)}</td>
                  <td className="p-3">{log.actor?.name || 'System'}</td>
                  <td className="p-3 font-mono text-xs">{log.action}</td>
                  <td className="p-3 text-xs">{log.entityType}/{log.entityId.slice(0, 8)}...</td>
                  <td className="p-3 text-xs">{log.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
