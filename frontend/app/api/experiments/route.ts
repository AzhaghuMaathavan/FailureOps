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

    authorizeProjectAccess(session, projectId);

    const data = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/experiments`,
      session
    );
    return apiSuccess(data);
  } catch (error) {
    return apiError(error, 'Unable to retrieve experiment registry.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const projectId = body.projectId || 'aurora';
    const action = body.action;

    authorizeProjectAccess(session, projectId);

    if (action !== 'start' && action !== 'verify') {
      throw new Error('Invalid experiment action. Use start or verify.');
    }
    if (!body.experimentId) {
      throw new Error('experimentId is required.');
    }

    const experimentId = encodeURIComponent(body.experimentId);
    const encodedProject = encodeURIComponent(projectId);
    const path =
      action === 'verify'
        ? `/api/v1/projects/${encodedProject}/experiments/${experimentId}/verify`
        : `/api/v1/projects/${encodedProject}/experiments/${experimentId}/start`;

    const respData = await ragFetch<any>(path, session, {
      method: 'POST',
      body: action === 'verify' ? JSON.stringify(body.measuredMetrics || {}) : undefined,
    });
    return apiSuccess(respData);
  } catch (error) {
    return apiError(error, 'Unable to execute experiment action.');
  }
}
