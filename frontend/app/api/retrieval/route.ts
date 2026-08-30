export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch, ragFetchSafe, mapRagHit } from '@/lib/server/rag';

async function runRetrieval(req: NextRequest, query: string, projectId?: string) {
  const session = requireAuth(req);
  const rate = checkRateLimit(req, 'search');
  if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

  const trimmed = (query || '').trim();
  if (!trimmed) {
    return apiSuccess({ query: '', projectId: projectId || null, hits: [], metrics: {} });
  }

  if (projectId) {
    authorizeProjectAccess(session, projectId);
  }

  const raw = projectId
    ? await ragFetch<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/retrieve`, session, {
        method: 'POST',
        body: JSON.stringify({ query: trimmed }),
      })
    : await ragFetchSafe<any>(
        '/api/v1/retrieval/search',
        session,
        { method: 'POST', body: JSON.stringify({ query: trimmed }) },
        { results: [], metrics: {} }
      );

  return apiSuccess({
    query: trimmed,
    projectId: raw.project_id || projectId || null,
    hits: (raw.results || []).map(mapRagHit),
    metrics: raw.metrics || {},
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    return await runRetrieval(req, searchParams.get('q') || '', searchParams.get('projectId') || undefined);
  } catch (error) {
    return apiError(error, 'Unable to retrieve evidence from the project knowledge base.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return await runRetrieval(req, body.query || body.q || '', body.projectId || undefined);
  } catch (error) {
    return apiError(error, 'Unable to retrieve evidence from the project knowledge base.');
  }
}
