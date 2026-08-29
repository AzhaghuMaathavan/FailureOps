export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { AnalysisJobSchema } from '@/lib/validation/schemas';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    // Strict rate limit on expensive AI analysis
    const rate = checkRateLimit(req, 'analysis');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = AnalysisJobSchema.parse(body);

    // Verify tenant authorization
    authorizeProjectAccess(session, validated.projectId);

    const resp = await fetch(`${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(validated.projectId)}/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': session.organizationId,
        'x-user-id': session.userId,
      },
      body: JSON.stringify({
        project_id: validated.projectId,
        reasoning_depth: (body as any)?.reasoningDepth || 'DEEP',
        skip_cache: (body as any)?.skipCache || false,
      }),

    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Backend analysis dispatch failed (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    return apiSuccess({
      jobId: data.analysis_id,
      analysisId: data.analysis_id,
      projectId: data.project_id,
      status: data.status,
      message: data.message,
      createdAt: new Date().toISOString(),
    }, 202);
  } catch (error) {
    return apiError(error, 'Failed to dispatch project analysis job.');
  }
}

