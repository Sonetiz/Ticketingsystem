'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectProgress } from '@ticketsystem/shared';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Array<ProjectProgress & { id: string; name: string; dueAt: string | null }>>('/projects'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Projects</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects?.map((project) => (
            <div key={project.id} className="bg-card rounded-xl border border-border p-5">
              <h2 className="font-semibold text-lg">{project.name}</h2>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{project.completedTickets}/{project.totalTickets} tickets</span>
                  <span>{project.percentComplete}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${project.percentComplete}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
