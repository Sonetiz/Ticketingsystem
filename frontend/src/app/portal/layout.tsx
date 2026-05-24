'use client';

import { usePathname } from 'next/navigation';
import { PortalSidebar } from '@/components/portal/sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/portal/login') return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <PortalSidebar />
      <main className="flex-1 p-6 bg-background overflow-auto">{children}</main>
    </div>
  );
}
