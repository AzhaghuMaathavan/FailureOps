export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  const response = apiSuccess({
    message: 'Logged out successfully.',
  });

  response.cookies.set(serverConfig.sessionCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
