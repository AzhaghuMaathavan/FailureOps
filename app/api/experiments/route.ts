export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { mockExperiments } from '@/data/mockExperiments';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';

    authorizeProjectAccess(session, projectId);

    const experiments = mockExperiments.filter(e => e.projectId === projectId);
    return apiSuccess(experiments);
  } catch (error) {
    return apiError(error, 'Unable to retrieve experiment registry.');
  }
}
