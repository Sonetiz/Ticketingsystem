'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function NewTicketLandingPage() {
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/public/tickets', {
        method: 'POST',
        body: JSON.stringify({
          requesterName,
          requesterEmail,
          subject,
          description,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Submit a support request</h1>
            <p className="text-sm text-muted-foreground">
              After submitting, we’ll email you a magic link to track and reply to your ticket.
            </p>
          </div>

          {submitted ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="font-medium">Request received</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check your inbox at <span className="font-medium">{requesterEmail}</span> for your ticket link.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                  onClick={() => {
                    setSubmitted(false);
                    setSubject('');
                    setDescription('');
                    setError(null);
                  }}
                >
                  Submit another request
                </button>
                <Link
                  href="/"
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Back to home
                </Link>
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Your name</label>
                  <input
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  minLength={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  placeholder="What do you need help with?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  placeholder="Include any relevant details (device, error message, impact, etc.)"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? 'Submitting…' : 'Submit request'}
                </button>
                <Link href="/portal/login" className="text-sm text-muted-foreground hover:underline">
                  Staff login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

