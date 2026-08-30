export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { getServerSession } from '@/lib/server/auth';
import { userStore } from '@/lib/server/user-store';

export async function PUT(req: NextRequest) {
  try {
    const session = getServerSession(req);
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return apiError(new Error('Current password and new password are required.'), 'Missing fields', 400);
    }

    const user = userStore.getUserById(session.userId) || userStore.getUserByEmail(session.email);
    if (!user) {
      return apiError(new Error('User not found.'), 'Not found', 404);
    }

    userStore.changePassword(user.id, currentPassword, newPassword);

    return apiSuccess({
      message: 'Password changed successfully.',
    });
  } catch (error) {
    return apiError(error, 'Failed to change password.');
  }
}
