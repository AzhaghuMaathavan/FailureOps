export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { getFailureDNA } from '@/data/mockFailureDNA';

import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';

    authorizeProjectAccess(session, projectId);

    // Attempt to query real backend microservice
    try {
      const backendResp = await fetch(
        `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/failure-dna`,
        {
          headers: {
            'x-organization-id': session.organizationId,
            'x-user-id': session.userId,
          },
          signal: AbortSignal.timeout(3000),
        }
      );

      if (backendResp.ok) {
        const dnaData = await backendResp.json();
        if (dnaData && dnaData.dimensions && dnaData.dimensions.length > 0) {
          return apiSuccess(dnaData);
        }
      }
    } catch {
      // Backend offline, proceed to fallback
    }

    const dna = getFailureDNA(projectId);
    return apiSuccess(dna);
  } catch (error) {
    return apiError(error, 'Unable to retrieve Failure DNA profile.');
  }
}

