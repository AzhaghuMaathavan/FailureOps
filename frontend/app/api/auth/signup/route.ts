export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { userStore } from '@/lib/server/user-store';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organization } = body;

    if (!name || !email || !password) {
      return apiError(new Error('Name, email, and password are required.'), 'Invalid registration data', 400);
    }

    if (password.length < 8) {
      return apiError(new Error('Password must be at least 8 characters long.'), 'Weak password', 400);
    }

    const { user, verificationCode } = await userStore.createUser({
      name,
      email,
      password,
      organizationName: organization,
      isVerified: true,
    });

    const sessionToken = `${user.email}:${Date.now()}`;
    const response = apiSuccess({
      message: 'Workspace account created successfully.',
      email: user.email,
      userId: user.id,
      user: userStore.sanitizeUser(user),
      devVerificationCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined,
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
    return apiError(error, 'Failed to create workspace account.');
  }
}
