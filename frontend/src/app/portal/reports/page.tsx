'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const { data: openByTeam } = useQuery({
    queryKey: ['report-open-by-team'],
    queryFn: () => api<Array<{ teamName: string; count: number }>>('/reports/open-by-team'),
  });

  const { data: periodStats } = useQuery({
    queryKey: ['report-period'],
    queryFn: () => api<{ created: number; resolved: number; avgResolutionMinutes: number }>('/reports/period-stats'),
  });

  const { data: workload } = useQuery({
    queryKey: ['report-workload'],
    queryFn: () => api<Array<{ agentName: string; count: number }>>('/reports/workload-by-agent'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold mb-2">Last 30 Days</h3>
          <p className="text-2xl font-bold">{periodStats?.created ?? 0}</p>
          <p className="text-sm text-muted-foreground">Tickets created</p>
          <p className="text-2xl font-bold mt-3">{periodStats?.resolved ?? 0}</p>
          <p className="text-sm text-muted-foreground">Tickets resolved</p>
          <p className="text-sm mt-2">Avg resolution: {periodStats?.avgResolutionMinutes ?? 0} min</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Open by Team</h3>
          {openByTeam?.map((t) => (
            <div key={t.teamName} className="flex justify-between py-1 text-sm">
              <span>{t.teamName}</span>
              <span className="font-medium">{t.count}</span>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold mb-3">Workload by Agent</h3>
          {workload?.map((a) => (
            <div key={a.agentName} className="flex justify-between py-1 text-sm">
              <span>{a.agentName}</span>
              <span className="font-medium">{a.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
