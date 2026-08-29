export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { SearchQuerySchema } from '@/lib/validation/schemas';
import { ragFetchSafe, mapRagHit, mapHistoricalCase, mapMemoryEntry } from '@/lib/server/rag';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'search');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const validated = SearchQuerySchema.parse({
      query: searchParams.get('q') || '',
      filter: searchParams.get('filter') || 'ALL',
      projectId: searchParams.get('projectId') || undefined,
    });

    const projectId = validated.projectId || 'aurora';
    const qLower = validated.query.toLowerCase();
    const wantsEvidence = validated.filter === 'ALL' || validated.filter === 'EVIDENCE';
    const wantsHistory = validated.filter === 'ALL' || validated.filter === 'HISTORICAL_CASES';
    const wantsMemory = validated.filter === 'ALL' || validated.filter === 'ORGANIZATIONAL_MEMORY';
    const wantsProjects = validated.filter === 'ALL' || validated.filter === 'ACTIVE_PROJECTS';

    const [histData, memData, ragData, projectData] = await Promise.all([
      wantsHistory
        ? ragFetchSafe<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/historical-cases`, session, {}, { matched_cases: [] })
        : Promise.resolve({ matched_cases: [] }),
      wantsMemory
        ? ragFetchSafe<any>(
            `/api/v1/projects/${encodeURIComponent(projectId)}/organizational-memory`,
            session,
            {},
            { memories: [] }
          )
        : Promise.resolve({ memories: [] }),
      wantsEvidence && validated.query
        ? ragFetchSafe<any>(
            `/api/v1/projects/${encodeURIComponent(projectId)}/retrieve`,
            session,
            {
              method: 'POST',
              body: JSON.stringify({ query: validated.query }),
            },
            { results: [] }
          )
        : Promise.resolve({ results: [] }),
      wantsProjects
        ? ragFetchSafe<any[]>('/api/v1/projects', session, {}, [])
        : Promise.resolve([]),
    ]);

    const matchedCases = (histData.matched_cases || [])
      .filter((c: any) =>
        !qLower ||
        [c.name, c.pattern, c.failure, c.company_alias, c.intervention, c.outcome]
          .some((field) => String(field || '').toLowerCase().includes(qLower))
      )
      .map(mapHistoricalCase);

    const matchedMemory = (memData.memories || memData.entries || [])
      .filter((m: any) =>
        !qLower ||
        [m.pattern, m.pattern_name, m.intervention, m.intervention_title, m.outcome, m.observed_impact]
          .some((field) => String(field || '').toLowerCase().includes(qLower)) ||
        (m.tags || []).some((t: string) => String(t).toLowerCase().includes(qLower)) ||
        (m.key_lessons || []).some((t: string) => String(t).toLowerCase().includes(qLower))
      )
      .map(mapMemoryEntry);

    const evidenceHits = (ragData.results || []).map(mapRagHit);

    const projectMatches = (Array.isArray(projectData) ? projectData : []).filter((p: any) =>
      !qLower ||
      [p.name, p.codeName, p.company, p.description, p.predictedNextFailure]
        .some((field) => String(field || '').toLowerCase().includes(qLower))
    );

    return apiSuccess({
      query: validated.query,
      filter: validated.filter,
      projectId,
      historicalMatches: matchedCases,
      organizationalMemoryMatches: matchedMemory,
      evidenceHits,
      projectMatches,
    });
  } catch (error) {
    return apiError(error, 'Global search failed to query the RAG knowledge base.');
  }
}
