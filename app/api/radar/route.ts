export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    const view = searchParams.get('view') || 'executive';

    authorizeProjectAccess(session, projectId);

    let backendPath = 'failure-radar';
    if (view === 'chain') {
      backendPath = 'failure-chain';
    } else if (view === 'predictions') {
      backendPath = 'predictions';
    }

    const backendResp = await fetch(
      `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/${backendPath}`,
      {
        headers: {
          'x-organization-id': session.organizationId,
          'x-user-id': session.userId,
        },
        cache: 'no-store',
      }
    );

    if (!backendResp.ok) {
      throw new Error(`Backend radar endpoint returned HTTP ${backendResp.status}`);
    }

    const rawData = await backendResp.json();
    return apiSuccess(rawData);
  } catch (error) {
    return apiError(error, 'Unable to query failure radar telemetry.');
  }
}

