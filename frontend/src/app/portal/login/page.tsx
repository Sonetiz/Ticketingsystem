'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setCsrfToken, getAuthConfig, getMicrosoftLoginUrl } from '@/lib/api';

function PortalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('agent@ticketsystem.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    getAuthConfig().then((c) => setSsoEnabled(c.ssoEnabled)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      setCsrfToken(data.csrfToken);
      router.push('/portal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="bg-card p-8 rounded-xl shadow-lg w-full max-w-md space-y-4 border border-border">
        <h1 className="text-2xl font-bold">Support Portal Login</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {ssoEnabled && (
          <>
            <a
              href={getMicrosoftLoginUrl('/portal')}
              className="flex items-center justify-center gap-2 w-full py-2 border border-border rounded-lg font-medium hover:bg-muted transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
              Sign in with Microsoft
            </a>
            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or use password</span></div></div>
          </>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background" required={!ssoEnabled} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in with password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return <Suspense><PortalLoginForm /></Suspense>;
}
