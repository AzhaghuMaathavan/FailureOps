export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  const response = apiSuccess({
    message: 'Logged out successfully.',
  });

  const isProd = process.env.NODE_ENV === 'production';
  const clearOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  response.cookies.set(serverConfig.sessionCookieName, '', clearOptions);
  response.cookies.set('failureops_session', '', clearOptions);
  response.cookies.set('__Host-failureops-session', '', clearOptions);

  return response;
}
