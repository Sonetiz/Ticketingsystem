'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ManageTemplatesPage() {
  const { data: projectTemplates } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => api<Array<{ name: string; tickets: Array<{ title: string }> }>>('/manage/project-templates'),
  });

  const { data: notificationTemplates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => api<Array<{ slug: string; name: string; channel: string }>>('/manage/notification-templates'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Templates</h1>
      <div>
        <h2 className="font-semibold mb-3">Project Templates</h2>
        {projectTemplates?.map((t, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 mb-3">
            <h3 className="font-medium">{t.name}</h3>
            <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
              {t.tickets.map((tk, j) => <li key={j}>{tk.title}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div>
        <h2 className="font-semibold mb-3">Notification Templates</h2>
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Channel</th>
              </tr>
            </thead>
            <tbody>
              {notificationTemplates?.map((t) => (
                <tr key={t.slug} className="border-t">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td className="p-3">{t.channel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
