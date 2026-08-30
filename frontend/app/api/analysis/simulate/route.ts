export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'analysis');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const projectId = body.projectId || body.project_id;
    if (!projectId) {
      return apiError(new Error('Project ID is required'), 'Project ID is required');
    }


    authorizeProjectAccess(session, projectId);

    const data = await ragFetch<any>(
      `/api/v1/test/intelligence/fixture`,
      session,
      {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          fixture_version: body.fixtureVersion || '1.0',
        }),
      }
    );

    return apiSuccess({
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
  } catch (error) {
    return apiError(error, 'Failed to execute simulated intelligence fixture.');
  }
}
