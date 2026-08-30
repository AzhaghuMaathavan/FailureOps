export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { userStore } from '@/lib/server/user-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return apiError(new Error('Email is required.'), 'Missing email parameter', 400);
    }

    const resetCode = await userStore.requestPasswordReset(email);

    return apiSuccess({
      message: 'If an account exists with this email, a 6-digit password reset PIN has been dispatched.',
      email,
      devResetCode: process.env.NODE_ENV !== 'production' ? resetCode : undefined,
    });
  } catch (error) {
    return apiError(error, 'Unable to process password reset request.');
  }
}
