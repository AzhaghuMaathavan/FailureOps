export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { AnalysisJobSchema } from '@/lib/validation/schemas';
import { ragFetch } from '@/lib/server/rag';

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

    if ((body as any)?.simulate) {
      const data = await ragFetch<any>(
        `/api/v1/test/intelligence/fixture`,
        session,
        {
          method: 'POST',
          body: JSON.stringify({
            project_id: validated.projectId,
            fixture_version: (body as any)?.fixtureVersion || '1.0',
          }),
        }
      );
      return apiSuccess({
        jobId: data.analysis_id,
        analysisId: data.analysis_id,
        projectId: data.project_id,
        isSimulated: data.is_simulated,
        source: data.source,
        fixtureVersion: data.fixture_version,
        status: data.status,
        message: data.message,
        metrics: data.metrics,
        createdAt: new Date().toISOString(),
      }, 200);
    }

    const data = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(validated.projectId)}/analysis`,
      session,
      {
        method: 'POST',
        body: JSON.stringify({
          project_id: validated.projectId,
          reasoning_depth: (body as any)?.reasoningDepth || 'DEEP',
          skip_cache: (body as any)?.skipCache || false,
        }),
      }
    );

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

