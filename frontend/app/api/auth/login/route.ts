export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { userStore } from '@/lib/server/user-store';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError(new Error('Email and password are required.'), 'Invalid login input', 400);
    }

    const user = userStore.authenticate(email, password);

    // If account not verified yet
    if (!user.isVerified) {
      return apiSuccess({
        requiresVerification: true,
        email: user.email,
        message: 'Account requires email verification before signing in.',
      });
    }

    const sessionToken = `${user.email}:${Date.now()}`;
    const response = apiSuccess({
      message: 'Authenticated successfully.',
      user: userStore.sanitizeUser(user),
      requiresVerification: false,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    response.cookies.set(serverConfig.sessionCookieName, sessionToken, cookieOptions);
    if (serverConfig.sessionCookieName !== 'failureops_session') {
      response.cookies.set('failureops_session', sessionToken, cookieOptions);
    }

    return response;
  } catch (error) {
    return apiError(error, 'Authentication failed. Please check your credentials.', 401);
  }
}
