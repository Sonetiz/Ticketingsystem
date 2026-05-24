'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { profile } from '@/lib/api';
import { toast } from '@/lib/toast';
import { FieldLabel, TextInput, BtnPrimary } from '@/components/ui/modal';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => profile.forgotPassword(email),
    onSuccess: () => {
      toast.success('If an account exists, a reset link has been sent');
      setSent(true);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="bg-card p-8 rounded-xl shadow-lg w-full max-w-md space-y-4 border border-border">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Check your email for a reset link. You can close this page.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <BtnPrimary type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send reset link'}
            </BtnPrimary>
          </form>
        )}
        <Link href="/portal/login" className="text-sm text-primary hover:underline block text-center">
          Back to login
        </Link>
      </div>
    </div>
  );
}
