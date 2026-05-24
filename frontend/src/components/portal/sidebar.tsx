'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as Dialog from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  Ticket,
  FolderKanban,
  Repeat,
  BarChart3,
  LogOut,
  Moon,
  Sun,
  Bell,
  BookOpen,
  HardDrive,
  User,
  Menu,
  X,
  CheckSquare,
  ShoppingBag,
  AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { logout, notifications } from '@/lib/api';

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/portal/tickets?view=active', label: 'Active Queue', icon: Ticket },
  { href: '/portal/tickets?view=mine', label: 'My Tickets', icon: Ticket },
  { href: '/portal/unassigned-tickets', label: 'Unassigned Tickets', icon: Ticket },
  { href: '/portal/tickets?view=on-hold', label: 'On Hold', icon: Ticket },
  { href: '/portal/tickets?view=overdue', label: 'Overdue', icon: Ticket },
  { href: '/portal/notifications', label: 'Notifications', icon: Bell, badge: true },
  { href: '/portal/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/portal/assets', label: 'Assets', icon: HardDrive },
  { href: '/portal/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/portal/catalog', label: 'Catalog', icon: ShoppingBag },
  { href: '/portal/problems', label: 'Problems', icon: AlertTriangle },
  { href: '/portal/projects', label: 'Projects', icon: FolderKanban },
  { href: '/portal/recurring', label: 'Recurring Tasks', icon: Repeat },
  { href: '/portal/reports', label: 'Reports', icon: BarChart3 },
  { href: '/portal/profile', label: 'Profile', icon: User },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notifications.unreadCount,
    refetchInterval: 60_000,
  });

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const basePath = item.href.split('?')[0];
        const active = item.exact
          ? pathname === basePath
          : pathname === item.href || pathname.startsWith(`${basePath}/`) || pathname.startsWith(basePath);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && unreadCount > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark';

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    router.push('/portal/login');
  };

  return (
    <div className="p-3 border-t border-border space-y-1">
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full hover:bg-muted"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full hover:bg-muted text-red-600 dark:text-red-400"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}

export function PortalSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu trigger */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg border border-border bg-card shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card min-h-screen flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="font-bold text-lg">Support Portal</h1>
          <p className="text-xs text-muted-foreground">IT Ticket System</p>
        </div>
        <NavLinks />
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 lg:hidden" />
          <Dialog.Content
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h1 className="font-bold text-lg">Support Portal</h1>
                <p className="text-xs text-muted-foreground">IT Ticket System</p>
              </div>
              <Dialog.Close aria-label="Close navigation menu" className="p-1 rounded hover:bg-muted">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter onNavigate={() => setMobileOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
