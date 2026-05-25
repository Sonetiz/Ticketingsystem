/**
 * Thin API helper for smoke test cleanup.
 * Logs in once per instance, reuses the session cookie + csrfToken for all
 * subsequent requests.
 */

const API_URL = process.env.API_URL ?? 'http://localhost:3001/api';

export class SmokeApiClient {
  private cookie = '';
  private csrfToken = '';

  constructor(
    private readonly email: string,
    private readonly password: string,
  ) {}

  async login(): Promise<void> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const body = await res.json();
    this.csrfToken = body.csrfToken ?? '';
    const setCookie = res.headers.get('set-cookie') ?? '';
    this.cookie = setCookie.split(';')[0];
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.cookie,
        'X-CSRF-Token': this.csrfToken,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  async delete(path: string): Promise<void> {
    await this.request(path, { method: 'DELETE' });
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}

/** Pre-configured client for the admin account. Call `.login()` first. */
export const adminApi = new SmokeApiClient(
  'admin@ticketsystem.local',
  'password123',
);

/** Pre-configured client for the agent account. Call `.login()` first. */
export const agentApi = new SmokeApiClient(
  'agent@ticketsystem.local',
  'password123',
);
