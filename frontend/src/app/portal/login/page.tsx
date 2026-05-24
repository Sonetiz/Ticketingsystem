'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setCsrfToken } from '@/lib/api';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('agent@ticketsystem.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl shadow-lg w-full max-w-md space-y-4 border border-border">
        <h1 className="text-2xl font-bold">Support Portal Login</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
