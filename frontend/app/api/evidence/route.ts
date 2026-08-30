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
    const projectId = searchParams.get('projectId') || 'aurora';
    const analysisId = searchParams.get('analysisId');

    // Verify tenant authorization for project evidence
    authorizeProjectAccess(session, projectId);

    const path = analysisId
      ? `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(analysisId)}/evidence`
      : `/api/v1/projects/${encodeURIComponent(projectId)}/evidence`;

    const evidencePacket = await ragFetch<Record<string, unknown>>(path, session);
    const packet = evidencePacket && typeof evidencePacket === 'object' ? evidencePacket : {};
    return apiSuccess({
      ...packet,
      packet,
    });
  } catch (error) {
    return apiError(error, 'Unable to retrieve evidence citations from backend.');
  }
}

