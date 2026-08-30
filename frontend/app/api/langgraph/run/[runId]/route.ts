export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { getRun } from '@/lib/langgraph/store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { runId } = await context.params;
    const run = getRun(runId);
    if (!run) {
      return apiError(new Error('NOT_FOUND'), 'LangGraph run not found.');
    }
    authorizeProjectAccess(session, run.projectId);
    return apiSuccess(run);
  } catch (error) {
    return apiError(error, 'Unable to load LangGraph run status.');
  }
}
