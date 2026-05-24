'use client';

import { Suspense, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { profile } from '@/lib/api';
import { toast } from '@/lib/toast';
import { FieldLabel, TextInput, BtnPrimary } from '@/components/ui/modal';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => profile.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset successfully');
      setDone(true);
    },
  });

  if (!token) {
    return (
      <p className="text-sm text-red-600">Invalid or missing reset token.</p>
    );
  }

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        Your password has been reset.{' '}
        <Link href="/portal/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (password !== confirm) {
          toast.error('Passwords do not match');
          return;
        }
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <FieldLabel>New password</FieldLabel>
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <div>
        <FieldLabel>Confirm password</FieldLabel>
        <TextInput
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      <BtnPrimary type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Resetting…' : 'Reset password'}
      </BtnPrimary>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="bg-card p-8 rounded-xl shadow-lg w-full max-w-md space-y-4 border border-border">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
        <Link href="/portal/login" className="text-sm text-primary hover:underline block text-center">
          Back to login
        </Link>
      </div>
    </div>
  );
}
