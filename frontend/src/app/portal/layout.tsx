'use client';

import { usePathname } from 'next/navigation';
import { PortalSidebar } from '@/components/portal/sidebar';
import { TopBar } from '@/components/portal/top-bar';
import { isRequesterOnly, useSession } from '@/hooks/useSession';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_FREE_PATHS = [
  '/portal/login',
  '/portal/login/callback',
  '/portal/forgot-password',
  '/portal/reset-password',
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthFree = AUTH_FREE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthFree) return <>{children}</>;

  return <PortalShell>{children}</PortalShell>;
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isRequesterOnly(user)) router.push('/new');
  }, [isLoading, router, user]);

  if (!isLoading && isRequesterOnly(user)) return null;

  return (
    <div className="flex min-h-screen">
      <PortalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6 py-3 pl-14 lg:pl-6">
          <TopBar />
          {isLoading ? (
            <Skeleton className="h-8 w-32 hidden sm:block" />
          ) : user ? (
            <div className="hidden sm:block text-sm text-muted-foreground shrink-0">
              {user.name}
            </div>
          ) : null}
        </header>
        <main className="flex-1 p-4 lg:p-6 bg-background overflow-auto">{children}</main>
      </div>
    </div>
  );
}
