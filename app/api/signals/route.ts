export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';
import { Signal } from '@/types';

function toPercent(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    const analysisId = searchParams.get('analysisId');

    authorizeProjectAccess(session, projectId);

    const endpointPath = analysisId
      ? `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(analysisId)}/signals`
      : `/api/v1/projects/${encodeURIComponent(projectId)}/signals`;

    const backendData = await ragFetch<any>(endpointPath, session);
    const rawSignals = backendData.signals || [];

    const mappedSignals: Signal[] = rawSignals.map((s: any) => ({
      id: s.signal_id,
      projectId: s.project_id || projectId,
      name: s.name,
      category: s.category,
      severity: s.severity || 'MEDIUM',
      direction: s.polarity || 'NEGATIVE',
      trend: s.status === 'IMPROVING' ? 'DECREASING' : 'INCREASING',
      confidence: toPercent(s.signal_confidence),
      metricChange: s.metric_change || 'Observed anomaly',
      supportingEvidenceIds: s.supporting_evidence_ids || [],
      supportingRelationshipIds: s.supporting_relationship_ids || [],
      historicalPrevalence: typeof s.historical_prevalence === 'number' ? s.historical_prevalence : 0,
      description: s.summary,
      signalStrength: toPercent(s.signal_strength),
      status: s.status,
      signalType: s.signal_type,
    }));

    return apiSuccess({
      analysisId: backendData.analysis_id && backendData.analysis_id !== 'none'
        ? backendData.analysis_id
        : null,
      signals: mappedSignals,
    });
  } catch (error) {
    return apiError(error, 'Unable to retrieve project operational signals.');
  }
}
