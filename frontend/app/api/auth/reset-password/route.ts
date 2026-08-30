export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { userStore } from '@/lib/server/user-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return apiError(new Error('Email, reset PIN, and new password are required.'), 'Missing parameters', 400);
    }

    if (newPassword.length < 8) {
      return apiError(new Error('Password must be at least 8 characters long.'), 'Weak password', 400);
    }

    const updatedUser = userStore.resetPassword(email, code, newPassword);

    return apiSuccess({
      message: 'Password reset successfully! You can now sign in with your new password.',
      email: updatedUser.email,
    });
  } catch (error) {
    return apiError(error, 'Failed to reset password.');
  }
}
