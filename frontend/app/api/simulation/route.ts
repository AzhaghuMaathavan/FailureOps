export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

async function runSimulation(projectId: string, session: ReturnType<typeof requireAuth>, scenarioId?: string) {
  authorizeProjectAccess(session, projectId);
  return ragFetch<any>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/simulate`,
    session,
    {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenarioId }),
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    const scenarioId = searchParams.get('scenarioId') || searchParams.get('scenario_id') || undefined;
    const rawData = await runSimulation(projectId, session, scenarioId);
    return apiSuccess(rawData);
  } catch (error) {
    return apiError(error, 'Unable to run what-if simulation.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId || 'aurora';
    const scenarioId = body.scenarioId || body.scenario_id || undefined;
    const rawData = await runSimulation(projectId, session, scenarioId);
    return apiSuccess(rawData);
  } catch (error) {
    return apiError(error, 'Unable to execute what-if simulation.');
  }
}
