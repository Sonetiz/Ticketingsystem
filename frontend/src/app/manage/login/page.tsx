'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setCsrfToken } from '@/lib/api';

export default function ManageLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ticketsystem.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      setCsrfToken(data.csrfToken);
      router.push('/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-slate-800 text-white p-8 rounded-xl w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Management Portal</h1>
        <p className="text-sm text-slate-400">Super Admin / System Admin access only</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 rounded-lg"
          placeholder="Password"
        />
        <button type="submit" className="w-full py-2 bg-blue-600 rounded-lg font-medium">
          Sign in
        </button>
      </form>
    </div>
  );
}
