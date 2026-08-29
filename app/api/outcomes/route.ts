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

    authorizeProjectAccess(session, projectId);

    const backendResp = await fetch(
      `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/outcomes`,
      {
        headers: {
          'x-organization-id': session.organizationId,
          'x-user-id': session.userId,
        },
        cache: 'no-store',
      }
    );

    if (!backendResp.ok) {
      throw new Error(`Backend outcomes returned HTTP ${backendResp.status}`);
    }

    const data = await backendResp.json();
    return apiSuccess(data);
  } catch (error) {
    return apiError(error, 'Unable to retrieve experiment outcomes.');
  }
}

