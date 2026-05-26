'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getMe, logout } from '@/lib/api';

export function useSession(options?: { redirectTo?: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['session'],
    queryFn: getMe,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.isError) {
      logout().finally(() => {
        router.push(options?.redirectTo || '/portal/login');
      });
    }
  }, [options?.redirectTo, query.isError, router]);

  return query;
}

export function isAdminUser(user: { roles?: string[]; permissions?: string[] } | null | undefined) {
  const roles = user?.roles || [];
  const permissions = user?.permissions || [];
  return (
    permissions.includes('manage.*') ||
    roles.includes('super_admin') ||
    roles.includes('system_admin')
  );
}

export function isRequesterOnly(user: { roles?: string[] } | null | undefined) {
  const roles = user?.roles || [];
  return roles.length === 1 && roles[0] === 'requester';
}
