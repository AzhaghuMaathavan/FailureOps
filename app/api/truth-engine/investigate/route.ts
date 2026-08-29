export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { TruthEngineQuerySchema } from '@/lib/validation/schemas';
import { serverConfig } from '@/lib/server/config';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'search');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = TruthEngineQuerySchema.parse(body);

    authorizeProjectAccess(session, validated.projectId);

    // Fetch project evidence and signals from backend to corroborate or refute claim
    const [evResp, sigResp] = await Promise.all([
      fetch(`${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(validated.projectId)}/evidence`, {
        headers: { 'x-organization-id': session.organizationId, 'x-user-id': session.userId },
        cache: 'no-store',
      }),
      fetch(`${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(validated.projectId)}/signals`, {
        headers: { 'x-organization-id': session.organizationId, 'x-user-id': session.userId },
        cache: 'no-store',
      }),
    ]);

    const evData = evResp.ok ? await evResp.json() : { evidence: [] };
    const sigData = sigResp.ok ? await sigResp.json() : { signals: [] };

    const claimLower = validated.assumptionText.toLowerCase();
    const allEvidence = evData.evidence || [];
    const allSignals = sigData.signals || [];

    // Search for relevant evidence matching the claim keywords
    const keywords = claimLower.split(/\s+/).filter(w => w.length > 3);
    const matchedEvidence = allEvidence.filter((e: any) => {
      const stmt = (e.statement || '').toLowerCase();
      return keywords.some(kw => stmt.includes(kw));
    });

    const matchedSignals = allSignals.filter((s: any) => {
      const summary = ((s.summary || '') + ' ' + (s.name || '')).toLowerCase();
      return keywords.some(kw => summary.includes(kw));
    });

    // Check if evidence refutes or supports the claim
    const hasNegativeSignal = matchedSignals.some((s: any) => s.polarity === 'NEGATIVE' || s.severity === 'CRITICAL' || s.severity === 'HIGH');
    const hasNegativeMetric = matchedEvidence.some((e: any) => e.normalized_value?.direction === 'DECREASE' || e.normalized_value?.direction === 'INCREASE' && (e.category === 'TECHNICAL' || e.category === 'OPERATIONAL'));

    let verdict: 'REFUTED' | 'SUPPORTED' | 'UNVERIFIED' = 'UNVERIFIED';
    let confidence = 50;
    let explanation = 'Insufficient empirical documentation in uploaded sources to conclusively evaluate this claim.';
    let evidenceSnippet = 'No direct empirical counter-evidence recorded.';
    let rootCauses: string[] = [];
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    if (matchedEvidence.length > 0 || matchedSignals.length > 0) {
      if (hasNegativeSignal || hasNegativeMetric) {
        verdict = 'REFUTED';
        confidence = 92;
        severity = 'CRITICAL';
        const topEv = matchedEvidence[0];
        const topSig = matchedSignals[0];
        explanation = `Empirical project records contradict this assumption. Real telemetry shows ${topSig?.name || topEv?.statement || 'active degrading metrics'}.`;
        evidenceSnippet = topEv?.statement || topSig?.summary || 'Empirical telemetry contradicts claim.';
        rootCauses = matchedSignals.map((s: any) => s.name).slice(0, 3);
        if (rootCauses.length === 0) rootCauses = ['Empirical metric drop observed in project telemetry'];
      } else {
        verdict = 'SUPPORTED';
        confidence = 88;
        severity = 'LOW';
        explanation = 'Empirical project documentation supports this operating assumption with no recorded anomalies.';
        evidenceSnippet = matchedEvidence[0]?.statement || 'Telemetry metrics remain within nominal bounds.';
        rootCauses = ['Metrics consistent with target performance'];
      }
    }

    const result = {
      id: `asm-${Math.random().toString(36).substring(2, 7)}`,
      claim: validated.assumptionText,
      category: matchedEvidence[0]?.category || 'ADOPTION',
      verdict,
      confidence,
      severity,
      evidenceSnippet,
      explanation,
      rootCauses,
      recommendedIntervention: verdict === 'REFUTED' ? 'Trigger Targeted Intervention Protocol' : 'Maintain Standard Monitoring Baseline',
      verifiedAt: new Date().toISOString().slice(0, 10),
    };

    return apiSuccess(result);
  } catch (error) {
    return apiError(error, 'Failed to execute truth engine claim investigation.');
  }
}

