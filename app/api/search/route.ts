export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { SearchQuerySchema } from '@/lib/validation/schemas';
import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'search');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const filter = searchParams.get('filter') || 'ALL';

    const validated = SearchQuerySchema.parse({ query, filter });

    // Multi-tenant query to backend memory engine
    const [histResp, memResp] = await Promise.all([
      fetch(`${serverConfig.ragInternalUrl}/api/v1/projects/aurora/historical-cases`, {
        headers: { 'x-organization-id': session.organizationId, 'x-user-id': session.userId },
        cache: 'no-store',
      }),
      fetch(`${serverConfig.ragInternalUrl}/api/v1/projects/aurora/organizational-memory`, {
        headers: { 'x-organization-id': session.organizationId, 'x-user-id': session.userId },
        cache: 'no-store',
      }),
    ]);

    const histData = histResp.ok ? await histResp.json() : { matched_cases: [] };
    const memData = memResp.ok ? await memResp.json() : { entries: [] };

    const qLower = validated.query.toLowerCase();
    const rawCases = histData.matched_cases || [];
    const rawMemory = memData.entries || [];

    const matchedCases = rawCases.filter((c: any) =>
      !qLower ||
      (c.name || '').toLowerCase().includes(qLower) ||
      (c.pattern || '').toLowerCase().includes(qLower) ||
      (c.failure || '').toLowerCase().includes(qLower)
    );

    const matchedMemory = rawMemory.filter((m: any) =>
      !qLower ||
      (m.pattern || '').toLowerCase().includes(qLower) ||
      (m.intervention || '').toLowerCase().includes(qLower) ||
      (m.tags || []).some((t: string) => t.toLowerCase().includes(qLower))
    );

    return apiSuccess({
      query: validated.query,
      filter: validated.filter,
      historicalMatches: matchedCases,
      organizationalMemoryMatches: matchedMemory,
    });
  } catch (error) {
    return apiError(error, 'Global search failed to query vector store.');
  }
}

