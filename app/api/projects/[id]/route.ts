export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch, RagBackendError, RagUnreachableError } from '@/lib/server/rag';
import { getDefaultProject } from '@/lib/server/default-projects';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { id } = await params;

    authorizeProjectAccess(session, id);

    try {
      const project = await ragFetch<any>(
        `/api/v1/projects/${encodeURIComponent(id)}`,
        session
      );
      return apiSuccess(project);
    } catch (error) {
      const canFallback =
        error instanceof RagUnreachableError ||
        (error instanceof RagBackendError && error.status === 404);
      const fallback = canFallback ? getDefaultProject(id) : null;
      if (fallback) {
        return apiSuccess(fallback);
      }
      throw error;
    }
  } catch (error) {
    return apiError(error, 'Unable to retrieve project details.');
  }
}
