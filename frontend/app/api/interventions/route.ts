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
      `/api/v1/projects/${encodeURIComponent(projectId)}/interventions`,
      session
    );
    return apiSuccess(data);
  } catch (error) {
    return apiError(error, 'Unable to retrieve intervention plan.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const projectId = body.projectId || 'aurora';
    const interventionId = body.interventionId;

    authorizeProjectAccess(session, projectId);

    if (!interventionId) {
      throw new Error('interventionId is required to promote to experiment.');
    }

    const data = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/interventions/${encodeURIComponent(interventionId)}/promote`,
      session,
      { method: 'POST' }
    );
    return apiSuccess(data);
  } catch (error) {
    return apiError(error, 'Unable to promote intervention to experiment.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const projectId = body.projectId || 'aurora';
    const interventionId = body.interventionId;
    const itemId = body.itemId;
    const completed = body.completed;

    authorizeProjectAccess(session, projectId);

    if (!interventionId || !itemId) {
      throw new Error('interventionId and itemId are required.');
    }

    const data = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/interventions/${encodeURIComponent(interventionId)}/action-items/${encodeURIComponent(itemId)}`,
      session,
      {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      }
    );
    return apiSuccess(data);
  } catch (error) {
    return apiError(error, 'Unable to toggle action item state.');
  }
}
