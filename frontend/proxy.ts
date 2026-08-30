import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected application route prefixes
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/projects',
  '/memory',
  '/settings',
  '/search',
  '/profile',
  '/intelligence',
  '/historical',
  '/debug',
  '/register',
];

// Auth routes where authenticated users should be redirected to /dashboard
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Generate or forward correlation Request ID
  const requestId = request.headers.get('x-request-id') || `REQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // 2. Check for active session cookie
  const sessionCookie =
    request.cookies.get('failureops_session')?.value ||
    request.cookies.get('__Host-failureops-session')?.value ||
    request.cookies.get(process.env.SESSION_COOKIE_NAME || 'failureops_session')?.value;

  const isAuthenticated = Boolean(sessionCookie && sessionCookie.includes(':'));

  // 3. Protect authenticated workspace routes
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    }
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // 4. Prevent authenticated users from seeing login/signup pages
  const isAuthPage = AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));

  if (isAuthPage && isAuthenticated) {
    const redirectTarget = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const targetUrl = new URL(redirectTarget, request.url);
    const response = NextResponse.redirect(targetUrl);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // 5. CSRF / Origin Validation for state-changing API methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host && process.env.NODE_ENV === 'production') {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return new NextResponse(
            JSON.stringify({
              success: false,
              error: 'CSRF Validation Failed',
              message: 'Cross-site request forgery detected. Request rejected.',
              requestId,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
            }
          );
        }
      } catch {}
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.svg (brand svg)
     * - public files (images, assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/).*)',
  ],
};
