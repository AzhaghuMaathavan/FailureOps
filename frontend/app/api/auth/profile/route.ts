export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { getServerSession } from '@/lib/server/auth';
import { userStore } from '@/lib/server/user-store';

export async function GET(req: NextRequest) {
  try {
    const session = getServerSession(req);
    const user = userStore.getUserById(session.userId) || userStore.getUserByEmail(session.email);
    if (!user) {
      return apiError(new Error('User profile not found.'), 'Not found', 404);
    }

    return apiSuccess({
      profile: userStore.sanitizeUser(user),
    });
  } catch (error) {
    return apiError(error, 'Failed to fetch user profile.');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getServerSession(req);
    const body = await req.json();

    const user = userStore.getUserById(session.userId) || userStore.getUserByEmail(session.email);
    if (!user) {
      return apiError(new Error('User not found.'), 'Not found', 404);
    }

    const updated = userStore.updateProfile(user.id, {
      name: body.name,
      title: body.title,
      organizationName: body.organizationName,
      bio: body.bio,
      avatarUrl: body.avatarUrl,
      twoFactorEnabled: body.twoFactorEnabled,
      notifications: body.notifications,
    });

    return apiSuccess({
      message: 'Profile updated successfully.',
      profile: userStore.sanitizeUser(updated),
    });
  } catch (error) {
    return apiError(error, 'Failed to update user profile.');
  }
}
