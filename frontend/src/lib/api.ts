const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

let csrfToken: string | null = null;

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (csrfToken && options.method && options.method !== 'GET') {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
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

export { API_BASE };
