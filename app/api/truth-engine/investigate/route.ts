export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { TruthEngineQuerySchema } from '@/lib/validation/schemas';
import { ragFetchSafe, mapRagHit } from '@/lib/server/rag';

function toPercent(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value <= 1 ? Math.round(value * 100) : Math.round(value)));
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'search');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = TruthEngineQuerySchema.parse(body);

    authorizeProjectAccess(session, validated.projectId);

    const [askData, ragData] = await Promise.all([
      ragFetchSafe<any>(
        `/api/v1/projects/${encodeURIComponent(validated.projectId)}/ask`,
        session,
        { method: 'POST', body: JSON.stringify({ query: validated.assumptionText }) },
        null
      ),
      ragFetchSafe<any>(
        `/api/v1/projects/${encodeURIComponent(validated.projectId)}/retrieve`,
        session,
        { method: 'POST', body: JSON.stringify({ query: validated.assumptionText }) },
        { results: [] }
      ),
    ]);

    const ragHits = (ragData.results || []).map(mapRagHit);
    const evidenceState = askData?.evidence_state || 'NONE';
    const hasGrounding = ragHits.length > 0 && evidenceState !== 'INSUFFICIENT_EVIDENCE' && evidenceState !== 'NONE';

    let verdict: 'REFUTED' | 'SUPPORTED' | 'UNVERIFIED' = 'UNVERIFIED';
    if (hasGrounding && evidenceState === 'SUPPORTED') {
      verdict = 'SUPPORTED';
    }

    const topScore = ragHits[0]?.score;
    const askConfidence = askData?.confidence;
    const confidence = toPercent(
      typeof askConfidence === 'number' ? askConfidence : typeof topScore === 'number' ? topScore : 0
    );

    const firstCitation = askData?.citations?.[0];
    const explanation =
      askData?.answer ||
      (hasGrounding
        ? 'Retrieved project documentation is available, but the claim was not classified by the RAG evidence state.'
        : 'Insufficient empirical documentation in uploaded sources to evaluate this claim.');
    const evidenceSnippet =
      firstCitation?.lineage?.document_name ||
      ragHits[0]?.snippet ||
      'No direct empirical evidence recorded.';

    return apiSuccess({
      id: `asm-${Date.now()}`,
      claim: validated.assumptionText,
      category: firstCitation?.category || 'UNCLASSIFIED',
      verdict,
      confidence,
      severity: verdict === 'UNVERIFIED' ? 'MEDIUM' : 'LOW',
      evidenceSnippet,
      explanation,
      rootCauses: ragHits.slice(0, 3).map((h: { filename?: string }) => h.filename).filter(Boolean),
      recommendedIntervention:
        verdict === 'UNVERIFIED'
          ? 'Upload additional evidence or refine the claim before acting'
          : 'Review retrieved citations before changing operating assumptions',
      verifiedAt: new Date().toISOString().slice(0, 10),
      evidenceSources: ragHits.map((h: { filename: string }) => h.filename).filter(Boolean).slice(0, 6),
      ragHits,
      evidenceState,
    });
  } catch (error) {
    return apiError(error, 'Failed to execute truth engine claim investigation.');
  }
}
