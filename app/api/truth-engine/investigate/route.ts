export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { TruthEngineQuerySchema } from '@/lib/validation/schemas';
import { ragFetchSafe, mapRagHit } from '@/lib/server/rag';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'search');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = TruthEngineQuerySchema.parse(body);

    authorizeProjectAccess(session, validated.projectId);

    const [askData, ragData, evData, sigData] = await Promise.all([
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
      ragFetchSafe<any>(
        `/api/v1/projects/${encodeURIComponent(validated.projectId)}/evidence`,
        session,
        {},
        { evidence: [] }
      ),
      ragFetchSafe<any>(
        `/api/v1/projects/${encodeURIComponent(validated.projectId)}/signals`,
        session,
        {},
        { signals: [] }
      ),
    ]);

    const ragHits = (ragData.results || []).map(mapRagHit);
    const allEvidence = evData.evidence || [];
    const allSignals = sigData.signals || [];

    const claimLower = validated.assumptionText.toLowerCase();
    const keywords = claimLower.split(/\s+/).filter((w) => w.length > 3);

    const matchedEvidence = allEvidence.filter((e: any) => {
      const stmt = (e.statement || '').toLowerCase();
      return keywords.some((kw) => stmt.includes(kw));
    });

    const matchedSignals = allSignals.filter((s: any) => {
      const summary = `${s.summary || ''} ${s.name || ''}`.toLowerCase();
      return keywords.some((kw) => summary.includes(kw));
    });

    const negativeTerms = ['fail', 'delay', 'churn', 'overload', 'drop', 'outage', 'risk', 'miss', 'decline', 'erosion', 'blocker', 'friction'];
    const hasNegativeSignal = matchedSignals.some(
      (s: any) => s.polarity === 'NEGATIVE' || s.severity === 'CRITICAL' || s.severity === 'HIGH'
    );
    const hasNegativeRag = ragHits.some((hit: { snippet?: string }) =>
      negativeTerms.some((term) => (hit.snippet || '').toLowerCase().includes(term))
    );
    const hasNegativeMetric = matchedEvidence.some(
      (e: any) =>
        e.normalized_value?.direction === 'DECREASE' ||
        (e.normalized_value?.direction === 'INCREASE' && (e.category === 'TECHNICAL' || e.category === 'OPERATIONAL'))
    );

    let verdict: 'REFUTED' | 'SUPPORTED' | 'UNVERIFIED' = 'UNVERIFIED';
    let confidence = 50;
    let explanation = 'Insufficient empirical documentation in uploaded sources to conclusively evaluate this claim.';
    let evidenceSnippet = 'No direct empirical counter-evidence recorded.';
    let rootCauses: string[] = [];
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    const hasGrounding = ragHits.length > 0 || matchedEvidence.length > 0 || matchedSignals.length > 0;

    if (hasGrounding) {
      if (hasNegativeSignal || hasNegativeMetric || hasNegativeRag) {
        verdict = 'REFUTED';
        confidence = Math.min(96, 70 + ragHits.length * 4);
        severity = 'CRITICAL';
        const topEv = matchedEvidence[0];
        const topSig = matchedSignals[0];
        const topHit = ragHits[0];
        explanation = `Retrieved project evidence contradicts this assumption. ${topSig?.name || topEv?.statement || topHit?.snippet?.slice(0, 180) || 'Active degrading metrics observed.'}`;
        evidenceSnippet = topHit?.snippet || topEv?.statement || topSig?.summary || 'Empirical telemetry contradicts claim.';
        rootCauses = matchedSignals.map((s: any) => s.name).slice(0, 3);
        if (rootCauses.length === 0) {
          rootCauses = ragHits.slice(0, 2).map((h: { filename: string }) => h.filename);
        }
      } else {
        verdict = 'SUPPORTED';
        confidence = Math.min(92, 68 + ragHits.length * 4);
        severity = 'LOW';
        explanation = 'Retrieved project documentation supports this operating assumption with no recorded anomalies.';
        evidenceSnippet = ragHits[0]?.snippet || matchedEvidence[0]?.statement || 'Telemetry metrics remain within nominal bounds.';
        rootCauses = ['Metrics consistent with target performance'];
      }
    }

    if (askData?.answer) {
      explanation = askData.answer;
      const firstCitation = askData.citations?.[0];
      if (firstCitation?.lineage?.document_name) {
        evidenceSnippet = firstCitation.lineage.document_name;
      }
      if (askData.evidence_state === 'INSUFFICIENT_EVIDENCE' && !hasGrounding) {
        verdict = 'UNVERIFIED';
        confidence = 48;
        severity = 'MEDIUM';
      }
    }

    return apiSuccess({
      id: `asm-${Math.random().toString(36).substring(2, 7)}`,
      claim: validated.assumptionText,
      category: matchedEvidence[0]?.category || 'ADOPTION',
      verdict,
      confidence,
      severity,
      evidenceSnippet,
      explanation,
      rootCauses,
      recommendedIntervention:
        verdict === 'REFUTED' ? 'Trigger Targeted Intervention Protocol' : 'Maintain Standard Monitoring Baseline',
      verifiedAt: new Date().toISOString().slice(0, 10),
      evidenceSources: ragHits.map((h: { filename: string }) => h.filename).filter(Boolean).slice(0, 6),
      ragHits,
    });
  } catch (error) {
    return apiError(error, 'Failed to execute truth engine claim investigation.');
  }
}
