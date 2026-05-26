'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCsrfToken } from '@/lib/api';
import { BtnPrimary } from '@/components/ui/modal';
import { JsonTextarea } from '@/components/ui/json-textarea';

interface Integration {
  connector: string;
  isActive: boolean;
  config: object;
}

function TeamsIntegrationCard({ integration }: { integration: Integration }) {
  const queryClient = useQueryClient();
  const cfg = (integration.config as any) || {};

  const [isActive, setIsActive] = useState(integration.isActive);
  const [type, setType] = useState<string>(cfg.type || 'mock');
  const [tenantId, setTenantId] = useState<string>(cfg.tenantId || '');
  const [clientId, setClientId] = useState<string>(cfg.clientId || '');
  const [clientSecret, setClientSecret] = useState<string>(cfg.clientSecret || '');
  const [teamId, setTeamId] = useState<string>(cfg.teamId || '');
  const [channelId, setChannelId] = useState<string>(cfg.channelId || '');
  const [webhookSecret, setWebhookSecret] = useState<string>(cfg.webhookSecret || '');
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: () =>
      api(`/manage/integrations/${integration.connector}`, {
        method: 'POST',
        body: JSON.stringify({
          isActive,
          config: {
            type,
            tenantId: tenantId || undefined,
            clientId: clientId || undefined,
            clientSecret: clientSecret || undefined,
            teamId: teamId || undefined,
            channelId: channelId || undefined,
            webhookSecret: webhookSecret || undefined,
          },
        }),
        headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-integrations'] });
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="bg-card rounded-xl border p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">teams</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="w-28 text-muted-foreground">Connector</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
          >
            <option value="mock">Mock</option>
            <option value="graph">Microsoft Graph</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Graph mode posts to a Team channel and ingests messages via Microsoft Graph change notifications.
        </p>
      </div>

      {type === 'graph' && (
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Tenant ID</span>
            <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Client ID</span>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Client Secret</span>
            <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background" />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Team ID</span>
              <input value={teamId} onChange={(e) => setTeamId(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Channel ID</span>
              <input value={channelId} onChange={(e) => setChannelId(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background" />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Webhook secret (clientState)</span>
            <input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background" />
          </label>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <BtnPrimary onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? 'Saving...' : 'Save'}
      </BtnPrimary>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const queryClient = useQueryClient();
  const [configText, setConfigText] = useState(JSON.stringify(integration.config, null, 2));
  const [isActive, setIsActive] = useState(integration.isActive);
  const [parsedConfig, setParsedConfig] = useState<object | null>(integration.config);
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => api(`/manage/integrations/${integration.connector}`, {
      method: 'POST',
      body: JSON.stringify({ config: parsedConfig ?? integration.config, isActive }),
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-integrations'] });
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="bg-card rounded-xl border p-5 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold capitalize">{integration.connector}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
      <JsonTextarea
        value={configText}
        onChange={(text, parsed) => { setConfigText(text); setParsedConfig(parsed); }}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <BtnPrimary
        onClick={() => {
          if (!parsedConfig) { setError('Invalid JSON'); return; }
          saveMutation.mutate();
        }}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? 'Saving...' : 'Save'}
      </BtnPrimary>
    </div>
  );
}

export default function ManageIntegrationsPage() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['manage-integrations'],
    queryFn: () => api<Integration[]>('/manage/integrations'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Integration Settings</h1>
      {isLoading ? <p>Loading...</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations?.map((i) => (
            i.connector === 'teams'
              ? <TeamsIntegrationCard key={i.connector} integration={i} />
              : <IntegrationCard key={i.connector} integration={i} />
          ))}
        </div>
      )}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-medium">Connector Abstraction</p>
        <p className="text-muted-foreground mt-1">
          Email: Mock (MailHog), IMAP, Microsoft Graph (skeleton). Teams: Mock, Microsoft Graph/Bot (skeleton).
          Edit JSON config and toggle active state per connector.
        </p>
      </div>
    </div>
  );
}
