export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { id } = await params;
    const body = await req.json();

    const result = await ragFetch<any>(`/api/v1/community/posts/${id}/comments`, session, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'x-user-name': session.name || session.email || 'Intelligence Contributor'
      }
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(error, 'Failed to post comment.');
  }
}
