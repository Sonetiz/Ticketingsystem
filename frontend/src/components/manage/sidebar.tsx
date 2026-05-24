'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  UsersRound,
  Settings,
  FileText,
  Plug,
  Key,
  ScrollText,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/api';

const navItems = [
  { href: '/manage', label: 'Overview', icon: Settings },
  { href: '/manage/users', label: 'Users', icon: Users },
  { href: '/manage/roles', label: 'Roles', icon: Shield },
  { href: '/manage/teams', label: 'Teams', icon: UsersRound },
  { href: '/manage/statuses', label: 'Statuses', icon: FileText },
  { href: '/manage/sla', label: 'SLA Rules', icon: FileText },
  { href: '/manage/integrations', label: 'Integrations', icon: Plug },
  { href: '/manage/templates', label: 'Templates', icon: FileText },
  { href: '/manage/api-tokens', label: 'API Tokens', icon: Key },
  { href: '/manage/settings', label: 'Settings', icon: SlidersHorizontal },
  { href: '/manage/audit', label: 'Audit Log', icon: ScrollText },
];

export function ManageSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/manage/login');
  };

  return (
    <aside className="w-64 border-r border-border bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="font-bold text-lg">Management Portal</h1>
        <p className="text-xs text-slate-400">Administration only</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                active ? 'bg-blue-600' : 'hover:bg-slate-800',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full hover:bg-slate-800 text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
