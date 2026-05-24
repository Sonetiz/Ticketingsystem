'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getMe, logout } from '@/lib/api';

export function useSession() {
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
        router.push('/portal/login');
      });
    }
  }, [query.isError, router]);

  return query;
}
