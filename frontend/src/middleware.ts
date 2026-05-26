import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/new',
  '/portal/login',
  '/portal/login/callback',
  '/portal/forgot-password',
  '/portal/reset-password',
  '/manage/login',
  '/manage/login/callback',
  '/status',
  '/csat',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth =
    pathname.startsWith('/portal') ||
    pathname.startsWith('/manage');

  if (!needsAuth || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get('session');
  if (!session?.value) {
    const loginPath = pathname.startsWith('/manage') ? '/manage/login' : '/portal/login';
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*', '/manage/:path*'],
};
