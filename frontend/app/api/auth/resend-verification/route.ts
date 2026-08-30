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

    const newCode = await userStore.resendVerificationCode(email);

    return apiSuccess({
      message: 'New verification code dispatched to your email.',
      email,
      devVerificationCode: process.env.NODE_ENV !== 'production' ? newCode : undefined,
    });
  } catch (error) {
    return apiError(error, 'Failed to resend verification code.');
  }
}
