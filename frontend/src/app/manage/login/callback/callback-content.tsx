'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setCsrfToken } from '@/lib/api';

export default function ManageLoginCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const csrf = searchParams.get('csrf');
    const returnTo = searchParams.get('returnTo') || '/manage';
    if (csrf) {
      setCsrfToken(csrf);
      if (typeof window !== 'undefined') localStorage.setItem('csrfToken', csrf);
    }
    router.replace(returnTo);
  }, [searchParams, router]);

  return null;
}
