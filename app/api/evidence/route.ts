export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { getEvidenceByProjectId } from '@/data/mockEvidence';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';

    // Verify tenant authorization for project evidence
    authorizeProjectAccess(session, projectId);

    const evidence = getEvidenceByProjectId(projectId);
    return apiSuccess(evidence);
  } catch (error) {
    return apiError(error, 'Unable to retrieve evidence citations.');
  }
}
