export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { SearchQuerySchema } from '@/lib/validation/schemas';
import { mockHistoricalCases } from '@/data/mockHistoricalCases';
import { mockMemoryEntries } from '@/data/mockMemory';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const rate = checkRateLimit(req, 'search');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const filter = searchParams.get('filter') || 'ALL';

    const validated = SearchQuerySchema.parse({ query, filter });

    // Multi-tenant privacy filter:
    // Global search returns ONLY anonymized learnings, public cases, or organizational knowledge.
    // Confidential project documents and internal company identities are strictly stripped.
    const filteredCases = mockHistoricalCases.filter(
      c => c.privacyLevel === 'ANONYMOUS_LEARNING' || c.privacyLevel === 'PUBLIC' || c.privacyLevel === 'ORGANIZATION'
    );

    const filteredMemory = mockMemoryEntries.filter(
      m =>
        m.pattern.toLowerCase().includes(validated.query.toLowerCase()) ||
        m.tags.some(t => t.toLowerCase().includes(validated.query.toLowerCase())) ||
        m.intervention.toLowerCase().includes(validated.query.toLowerCase())
    );

    return apiSuccess({
      query: validated.query,
      filter: validated.filter,
      historicalMatches: filteredCases,
      organizationalMemoryMatches: filteredMemory,
    });
  } catch (error) {
    return apiError(error, 'Global search failed to query vector store.');
  }
}
