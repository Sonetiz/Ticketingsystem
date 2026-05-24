'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ManageIntegrationsPage() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['manage-integrations'],
    queryFn: () => api<Array<{ connector: string; isActive: boolean; config: object }>>('/manage/integrations'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Integration Settings</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations?.map((i) => (
            <div key={i.connector} className="bg-card rounded-xl border p-5">
              <div className="flex justify-between">
                <h2 className="font-semibold capitalize">{i.connector}</h2>
                <span className={`text-xs px-2 py-0.5 rounded ${i.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                  {i.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(i.config, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-medium">Connector Abstraction</p>
        <p className="text-muted-foreground mt-1">
          Email: Mock (MailHog), IMAP, Microsoft Graph (skeleton). Teams: Mock, Microsoft Graph/Bot (skeleton).
          Configure via environment variables or update settings here.
        </p>
      </div>
    </div>
  );
}
