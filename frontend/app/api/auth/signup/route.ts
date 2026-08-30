export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { userStore } from '@/lib/server/user-store';

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
    });

    return apiSuccess({
      message: 'Account created successfully. Verification code dispatched to your email.',
      email: user.email,
      userId: user.id,
      // Provide verification code in response for rapid testing environments if email delivery is delayed
      devVerificationCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined,
    });
  } catch (error) {
    return apiError(error, 'Failed to create workspace account.');
  }
}
