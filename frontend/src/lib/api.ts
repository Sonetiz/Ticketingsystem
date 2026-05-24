import type { PaginatedResult, TicketSummary } from '@ticketsystem/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

let csrfToken: string | null = null;

function buildHeaders(options: RequestInit, json = true): Record<string, string> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (json && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (csrfToken && options.method && options.method !== 'GET') {
    headers['X-CSRF-Token'] = csrfToken;
  }
  return headers;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options),
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const data = await api<{ user: unknown; csrfToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  csrfToken = data.csrfToken;
  if (typeof window !== 'undefined') {
    localStorage.setItem('csrfToken', data.csrfToken);
  }
  return data;
}

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('csrfToken');
  }
  return null;
}

export async function getMe() {
  return api<{ id: string; email: string; name: string; roles: string[]; permissions: string[] }>(
    '/auth/me',
  );
}

export async function getAuthConfig() {
  return api<{ ssoEnabled: boolean; ldapEnabled: boolean }>('/auth/config');
}

export function getMicrosoftLoginUrl(returnTo: string) {
  return `${API_BASE}/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function logout() {
  await api('/auth/logout', { method: 'POST' });
  csrfToken = null;
  if (typeof window !== 'undefined') localStorage.removeItem('csrfToken');
}

// ─── Typed domain helpers ───────────────────────────────────────────────────

export interface TicketListFilters {
  q?: string;
  status?: string;
  priority?: string;
  slaBreached?: boolean;
  overdue?: boolean;
  onHold?: boolean;
  view?: string;
  assigneeId?: string;
  assignedTeamId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  projectId?: string | null;
  assigneeId?: string | null;
  assignedTeamId?: string | null;
  tags?: string[];
}

export interface AssignTicketPayload {
  assigneeId?: string | null;
  assignedTeamId?: string | null;
}

export interface TicketDetail {
  id: string;
  number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: string | null;
  isOnHold: boolean;
  holdReason: string | null;
  holdUntil: string | null;
  holdNote: string | null;
  assignee: { id: string; name: string } | null;
  assignedTeam: { id: string; name: string; slug?: string } | null;
  project: { id: string; name: string } | null;
  requester: { id: string; name: string; email: string } | null;
  messages: Array<{
    id: string;
    kind: string;
    body: string;
    isPublic: boolean;
    createdAt: string;
    author: { id: string; name: string; email?: string } | null;
  }>;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  watchers: Array<{ id: string; userId: string; user: { id: string; name: string } }>;
  linksFrom: Array<{
    id: string;
    linkType: string;
    toTicket?: { id: string; number: number; title: string };
  }>;
  linksTo: Array<{
    id: string;
    linkType: string;
    fromTicket?: { id: string; number: number; title: string };
  }>;
  tags?: Array<{ id: string; tag: string }>;
}

export interface TicketWatcher {
  id: string;
  userId: string;
  user: { id: string; name: string };
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  payload?: { ticketId?: string } | null;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category?: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export interface AssetItem {
  id: string;
  name: string;
  assetType: string;
  identifier?: string | null;
  serviceId?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedAt: string;
}

export interface KnowledgeArticlePayload {
  title: string;
  slug: string;
  content: string;
  category?: string;
  isPublic?: boolean;
}

export interface AssetPayload {
  name: string;
  assetType: string;
  identifier?: string | null;
  serviceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SearchResultItem {
  type: 'ticket' | 'kb' | 'asset';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface GlobalSearchResult {
  results: SearchResultItem[];
}

function toQueryString(filters: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const tickets = {
  list: (filters: TicketListFilters = {}) =>
    api<PaginatedResult<TicketSummary>>(`/tickets${toQueryString(filters as Record<string, string | number | boolean | undefined>)}`),

  get: (id: string) => api<TicketDetail>(`/tickets/${id}`),

  update: (id: string, data: UpdateTicketPayload) =>
    api(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  assign: (id: string, data: AssignTicketPayload) =>
    api(`/tickets/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),

  watchers: (ticketId: string) => api<TicketWatcher[]>(`/tickets/${ticketId}/watchers`),

  addWatcher: (ticketId: string, userId: string) =>
    api(`/tickets/${ticketId}/watchers/${userId}`, { method: 'POST' }),

  removeWatcher: (ticketId: string, userId: string) =>
    api(`/tickets/${ticketId}/watchers/${userId}/remove`, { method: 'POST' }),

  bulkAssign: (ids: string[], data: AssignTicketPayload) =>
    api('/tickets/bulk/assign', { method: 'POST', body: JSON.stringify({ ids, ...data }) }),

  bulkStatus: (ids: string[], status: string) =>
    api('/tickets/bulk/status', { method: 'POST', body: JSON.stringify({ ids, status }) }),

  bulkClose: (ids: string[]) =>
    api('/tickets/bulk/close', { method: 'POST', body: JSON.stringify({ ids }) }),
};

export const attachments = {
  upload: (ticketId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<{ id: string; filename: string; downloadUrl: string }>(
      `/tickets/${ticketId}/attachments`,
      { method: 'POST', body: form },
    );
  },
};

export const notifications = {
  list: (unreadOnly = false) =>
    api<NotificationItem[]>(`/notifications${unreadOnly ? '?unread=true' : ''}`),

  unreadCount: () => api<number>('/notifications/unread-count'),

  markRead: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => api('/notifications/read-all', { method: 'POST' }),
};

export const kb = {
  list: () => api<KnowledgeArticle[]>('/knowledge-base'),
  create: (data: KnowledgeArticlePayload) =>
    api<KnowledgeArticle>('/knowledge-base', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
    }),
};

export const assets = {
  list: () => api<AssetItem[]>('/assets'),
  create: (data: AssetPayload) =>
    api<AssetItem>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
    }),
  update: (id: string, data: AssetPayload) =>
    api<AssetItem>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
    }),
};

export const search = {
  global: (q: string) =>
    api<GlobalSearchResult>(`/search${toQueryString({ q })}`),
};

export const profile = {
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  revokeAllSessions: () => api('/auth/sessions/revoke-all', { method: 'POST' }),

  forgotPassword: (email: string) =>
    api('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, newPassword: string) =>
    api('/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
};

export { API_BASE };
