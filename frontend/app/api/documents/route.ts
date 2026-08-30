export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id') || searchParams.get('projectId') || 'aurora';
    authorizeProjectAccess(session, projectId);

    const docs = await ragFetch<any[]>(
      `/api/documents?project_id=${encodeURIComponent(projectId)}`,
      session
    );
    return apiSuccess(Array.isArray(docs) ? docs : []);
  } catch (error) {
    return apiError(error, 'Failed to retrieve documents.');
  }
}
