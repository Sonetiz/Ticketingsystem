'use client';

import { usePathname } from 'next/navigation';
import { ManageSidebar } from '@/components/manage/sidebar';

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/manage/login') return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <ManageSidebar />
      <main className="flex-1 p-6 bg-slate-50 dark:bg-slate-900 overflow-auto">{children}</main>
    </div>
  );
}
