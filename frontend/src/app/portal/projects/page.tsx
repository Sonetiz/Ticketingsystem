'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, getCsrfToken } from '@/lib/api';
import { Modal, FieldLabel, TextInput, TextArea, BtnPrimary, BtnSecondary } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';
import type { ProjectProgress } from '@ticketsystem/shared';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Array<ProjectProgress & { id: string; name: string; dueAt: string | null }>>('/projects'),
  });

  const createMutation = useMutation({
    mutationFn: () => api('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
    }),
    onSuccess: () => {
      toast.success('Project created');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setName('');
      setDescription('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>New project</BtnPrimary>
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects?.map((project) => (
            <Link key={project.id} href={`/portal/projects/${project.id}`} className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors block">
              <h2 className="font-semibold text-lg">{project.name}</h2>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{project.completedTickets}/{project.totalTickets} tickets</span>
                  <span>{project.percentComplete}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${project.percentComplete}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create project">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div><FieldLabel>Name</FieldLabel><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><FieldLabel>Description</FieldLabel><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="flex gap-2 justify-end">
            <BtnSecondary type="button" onClick={() => setShowCreate(false)}>Cancel</BtnSecondary>
            <BtnPrimary type="submit" disabled={createMutation.isPending}>Create</BtnPrimary>
          </div>
        </form>
      </Modal>
    </div>
  );
}
