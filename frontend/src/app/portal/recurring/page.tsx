'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface RecurringTask {
  id: string;
  name: string;
  titleTemplate: string;
  rrule: string;
  isActive: boolean;
  assignedTeam: { name: string } | null;
}

export default function RecurringPage() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: () => api<RecurringTask[]>('/recurring-tasks'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recurring Tasks</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Template</th>
                <th className="text-left p-3">Schedule</th>
                <th className="text-left p-3">Team</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks?.map((task) => (
                <tr key={task.id} className="border-t border-border">
                  <td className="p-3 font-medium">{task.name}</td>
                  <td className="p-3">{task.titleTemplate}</td>
                  <td className="p-3 font-mono text-xs">{task.rrule}</td>
                  <td className="p-3">{task.assignedTeam?.name || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {task.isActive ? 'Active' : 'Paused'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
