export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { SaveMemorySchema } from '@/lib/validation/schemas';
import { ragFetch, ragFetchSafe, mapHistoricalCase, mapMemoryEntry } from '@/lib/server/rag';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    const view = searchParams.get('view');
    const pattern = searchParams.get('pattern');

    if (view === 'historical') {
      const memoryData = await ragFetchSafe<any>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/historical-cases`,
        session,
        {},
        { matched_cases: [] }
      );
      const cases = (memoryData.matched_cases || []).map(mapHistoricalCase);
      return apiSuccess({
        ...memoryData,
        matched_cases: cases,
        cases,
        similar_cases: cases,
      });
    }

    const endpointPath = `/api/v1/projects/${encodeURIComponent(projectId)}/organizational-memory${
      pattern ? `?pattern=${encodeURIComponent(pattern)}` : ''
    }`;
    const memoryData = await ragFetchSafe<any>(endpointPath, session, {}, { memories: [] });
    const entries = (memoryData.memories || memoryData.entries || []).map(mapMemoryEntry);
    return apiSuccess({
      ...memoryData,
      memories: entries,
      entries,
    });
  } catch (error) {
    return apiError(error, 'Unable to load organizational memory vault.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'upload');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    SaveMemorySchema.parse(body);

    const projectId = body.projectId || 'aurora';
    authorizeProjectAccess(session, projectId);

    const result = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/organizational-memory`,
      session,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(error, 'Failed to save validated learning to organizational memory.');
  }
}
