'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ManageSidebar } from '@/components/manage/sidebar';
import { isAdminUser, useSession } from '@/hooks/useSession';
import { logout } from '@/lib/api';

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authFree =
    pathname === '/manage/login' ||
    pathname === '/manage/login/callback';

  const { data: user, isLoading } = useSession({ redirectTo: '/manage/login' });

  useEffect(() => {
    if (authFree) return;
    if (isLoading) return;
    if (!isAdminUser(user)) {
      logout().finally(() => router.push('/portal'));
    }
  }, [authFree, isLoading, router, user]);

  if (authFree) return <>{children}</>;
  if (isLoading) return null;
  if (!isAdminUser(user)) return null;

  return (
    <div className="flex min-h-screen">
      <ManageSidebar />
      <main className="flex-1 p-6 bg-slate-50 dark:bg-slate-900 overflow-auto">{children}</main>
    </div>
  );
}
