import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Generate or forward correlation Request ID for traceability
  const requestId = request.headers.get('x-request-id') || `REQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  response.headers.set('x-request-id', requestId);

  // 2. CSRF / Origin Validation for state-changing methods (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // In production, enforce that origin matches application host
    if (origin && host && process.env.NODE_ENV === 'production') {
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
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
