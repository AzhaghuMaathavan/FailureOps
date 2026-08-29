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
    const analysisId = searchParams.get('analysisId');

    // Verify tenant authorization for project evidence
    authorizeProjectAccess(session, projectId);

    const endpointUrl = analysisId
      ? `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(analysisId)}/evidence`
      : `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/evidence`;

    const resp = await fetch(endpointUrl, {
      headers: {
        'x-organization-id': session.organizationId,
        'x-user-id': session.userId,
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      throw new Error(`Backend returned HTTP ${resp.status}`);
    }

    const evidencePacket = await resp.json();
    return apiSuccess(evidencePacket);
  } catch (error) {
    return apiError(error, 'Unable to retrieve evidence citations from backend.');
  }
}

