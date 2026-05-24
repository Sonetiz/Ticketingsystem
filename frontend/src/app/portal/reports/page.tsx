'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, getCsrfToken } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';

export default function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: openByTeam, isLoading: loadingTeams } = useQuery({
    queryKey: ['report-open-by-team'],
    queryFn: () => api<Array<{ teamName: string; count: number }>>('/reports/open-by-team'),
  });

  const { data: periodStats, isLoading: loadingPeriod } = useQuery({
    queryKey: ['report-period', from, to],
    queryFn: () => api<{ created: number; resolved: number; avgResolutionMinutes: number }>(`/reports/period-stats?from=${from}&to=${to}`),
  });

  const { data: workload, isLoading: loadingWorkload } = useQuery({
    queryKey: ['report-workload'],
    queryFn: () => api<Array<{ agentName: string; count: number }>>('/reports/workload-by-agent'),
  });

  const exportCsv = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/reports/open-by-team?format=csv`, { credentials: 'include' });
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'open-by-team.csv';
      a.click();
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const isLoading = loadingTeams || loadingPeriod || loadingWorkload;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ml-2 border border-border rounded px-2 py-1 bg-background" />
          </label>
          <label className="text-sm">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ml-2 border border-border rounded px-2 py-1 bg-background" />
          </label>
          <button type="button" onClick={exportCsv} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">
            Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-5">
            <h3 className="font-semibold mb-2">Period Summary</h3>
            <p className="text-2xl font-bold">{periodStats?.created ?? 0}</p>
            <p className="text-sm text-muted-foreground">Tickets created</p>
            <p className="text-2xl font-bold mt-3">{periodStats?.resolved ?? 0}</p>
            <p className="text-sm text-muted-foreground">Tickets resolved</p>
            <p className="text-sm mt-2">Avg resolution: {periodStats?.avgResolutionMinutes ?? 0} min</p>
          </div>
          <div className="bg-card rounded-xl border p-5 md:col-span-2">
            <h3 className="font-semibold mb-3">Open by Team</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={openByTeam || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="teamName" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-5 md:col-span-3">
            <h3 className="font-semibold mb-3">Workload by Agent</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th className="text-left p-2">Agent</th><th className="text-left p-2">Open tickets</th><th className="text-left p-2">Drill-down</th></tr></thead>
                <tbody>
                  {workload?.map((a) => (
                    <tr key={a.agentName} className="border-t border-border">
                      <td className="p-2">{a.agentName}</td>
                      <td className="p-2 font-medium">{a.count}</td>
                      <td className="p-2"><Link href={`/portal/tickets?view=mine`} className="text-primary text-xs hover:underline">View queue</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
