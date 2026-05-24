'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Plus } from 'lucide-react';

export default function RequesterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/requester/login';

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/requester" className="flex items-center gap-2 font-semibold">
            <Ticket className="w-5 h-5 text-primary" />
            My Support
          </Link>
          <Link
            href="/portal/tickets/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            New request
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 lg:p-6">{children}</main>
    </div>
  );
}
