export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { id } = await context.params;
    const evidenceItem = await ragFetch<Record<string, unknown>>(`/api/v1/evidence/${encodeURIComponent(id)}`, session);
    return apiSuccess(evidenceItem);
  } catch (error) {
    return apiError(error, 'Unable to retrieve evidence item from backend.');
  }
}
