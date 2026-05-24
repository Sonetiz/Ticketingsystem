'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', params.id],
    queryFn: () => api<{
      id: string;
      name: string;
      description: string | null;
      progress: { totalTickets: number; completedTickets: number; percentComplete: number };
      tickets: Array<{ id: string; number: number; title: string; status: string; priority: string }>;
    }>(`/projects/${params.id}`),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      <Link href="/portal/projects" className="text-sm text-primary hover:underline">← Projects</Link>
      <h1 className="text-2xl font-bold">{project?.name}</h1>
      {project?.description && <p className="text-muted-foreground">{project.description}</p>}
      <div className="bg-card rounded-xl border p-4">
        <p className="text-sm">{project?.progress.completedTickets}/{project?.progress.totalTickets} complete ({project?.progress.percentComplete}%)</p>
      </div>
      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">Status</th></tr></thead>
          <tbody>
            {project?.tickets.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3"><Link href={`/portal/tickets/${t.id}`} className="text-primary font-mono">{t.number}</Link></td>
                <td className="p-3">{t.title}</td>
                <td className="p-3">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
