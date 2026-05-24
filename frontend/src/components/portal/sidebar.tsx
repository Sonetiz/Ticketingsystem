'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  FolderKanban,
  Repeat,
  BarChart3,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/tickets?view=active', label: 'Active Queue', icon: Ticket },
  { href: '/portal/tickets?view=mine', label: 'My Tickets', icon: Ticket },
  { href: '/portal/tickets?view=on-hold', label: 'On Hold', icon: Ticket },
  { href: '/portal/tickets?view=overdue', label: 'Overdue', icon: Ticket },
  { href: '/portal/projects', label: 'Projects', icon: FolderKanban },
  { href: '/portal/recurring', label: 'Recurring Tasks', icon: Repeat },
  { href: '/portal/reports', label: 'Reports', icon: BarChart3 },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleLogout = async () => {
    await logout();
    router.push('/portal/login');
  };

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="font-bold text-lg">Support Portal</h1>
        <p className="text-xs text-muted-foreground">IT Ticket System</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full hover:bg-muted"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full hover:bg-muted text-red-600"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
