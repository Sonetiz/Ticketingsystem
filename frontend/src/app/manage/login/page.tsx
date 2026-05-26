'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setCsrfToken, getAuthConfig, getMicrosoftLoginUrl, logout } from '@/lib/api';
import { isAdminUser } from '@/hooks/useSession';

function ManageLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ticketsystem.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    getAuthConfig().then((c) => setSsoEnabled(c.ssoEnabled)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      setCsrfToken(data.csrfToken);
      const user = data.user as { roles?: string[]; permissions?: string[] } | undefined;
      if (!isAdminUser(user)) {
        await logout().catch(() => {});
        setError('Management portal access denied');
        return;
      }
      router.push('/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 text-white p-8 rounded-xl w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Management Portal</h1>
        <p className="text-sm text-slate-400">Super Admin / System Admin access only</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {ssoEnabled && (
          <>
            <a href={getMicrosoftLoginUrl('/manage')} className="flex items-center justify-center gap-2 w-full py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition">
              Sign in with Microsoft
            </a>
            <p className="text-center text-xs text-slate-500">or use password</p>
          </>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-700 rounded-lg" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-700 rounded-lg" placeholder="Password" />
          <button type="submit" className="w-full py-2 bg-blue-600 rounded-lg font-medium">Sign in with password</button>
        </form>
      </div>
    </div>
  );
}

export default function ManageLoginPage() {
  return <Suspense><ManageLoginForm /></Suspense>;
}
