'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { profile, logout } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useSession } from '@/hooks/useSession';
import { FieldLabel, TextInput, BtnPrimary } from '@/components/ui/modal';

export default function ProfilePage() {
  const { data: user } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: () => profile.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: profile.revokeAllSessions,
    onSuccess: async () => {
      toast.success('All other sessions revoked');
      await logout();
      router.push('/portal/login');
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Profile</h1>

      {user && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-1">
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Roles: {user.roles.join(', ')}
          </p>
        </div>
      )}

      <form onSubmit={handleChangePassword} className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <FieldLabel>Current password</FieldLabel>
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <FieldLabel>New password</FieldLabel>
          <TextInput
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div>
          <FieldLabel>Confirm new password</FieldLabel>
          <TextInput
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <BtnPrimary type="submit" disabled={changePasswordMutation.isPending}>
          {changePasswordMutation.isPending ? 'Saving…' : 'Update password'}
        </BtnPrimary>
      </form>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">Sessions</h2>
        <p className="text-sm text-muted-foreground">
          Revoke all sessions except the current one. You will be signed out on other devices.
        </p>
        <button
          type="button"
          onClick={() => revokeMutation.mutate()}
          disabled={revokeMutation.isPending}
          className="px-4 py-2 border border-red-300 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
        >
          Revoke all sessions
        </button>
      </div>
    </div>
  );
}
