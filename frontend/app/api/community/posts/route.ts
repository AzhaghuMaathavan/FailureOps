export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const result = await ragFetch<any>(`/api/v1/community/posts${qs ? `?${qs}` : ''}`, session);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error, 'Unable to retrieve community posts.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const result = await ragFetch<any>('/api/v1/community/posts', session, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'x-user-name': session.name || session.email || 'Intelligence Architect'
      }
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(error, 'Failed to publish community post.');
  }
}
