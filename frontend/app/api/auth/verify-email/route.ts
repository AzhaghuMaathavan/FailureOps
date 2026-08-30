export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { userStore } from '@/lib/server/user-store';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return apiError(new Error('Email and verification code are required.'), 'Invalid verification input', 400);
    }

    const verifiedUser = userStore.verifyEmail(email, code);

    // Issue session token
    const sessionToken = `${verifiedUser.email}:${Date.now()}`;
    const response = apiSuccess({
      message: 'Email verified successfully! Workspace activated.',
      user: userStore.sanitizeUser(verifiedUser),
    });

    // Set cookie
    response.cookies.set(serverConfig.sessionCookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return apiError(error, 'Email verification failed.');
  }
}
