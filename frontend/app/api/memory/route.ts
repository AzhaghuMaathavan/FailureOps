export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { SaveMemorySchema } from '@/lib/validation/schemas';
import { ragFetchSafe, mapHistoricalCase, mapMemoryEntry } from '@/lib/server/rag';

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

    return NextResponse.json(
      {
        success: false,
        error: 'Not Supported',
        message:
          'Organizational memory is derived from verified experiment outcomes. There is no standalone write store.',
      },
      { status: 409 }
    );
  } catch (error) {
    return apiError(error, 'Failed to save validated learning to organizational memory.');
  }
}
