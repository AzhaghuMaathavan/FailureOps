export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { id } = await params;
    const post = await ragFetch<any>(`/api/v1/community/posts/${id}`, session);
    return apiSuccess(post);
  } catch (error) {
    return apiError(error, 'Unable to retrieve community post details.');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { id } = await params;
    const result = await ragFetch<any>(`/api/v1/community/posts/${id}`, session, {
      method: 'DELETE',
    });
    return apiSuccess(result);
  } catch (error) {
    return apiError(error, 'Failed to delete community post.');
  }
}
