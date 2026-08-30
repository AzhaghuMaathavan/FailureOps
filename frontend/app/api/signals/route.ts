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
      id: s.signal_id || s.id,
      projectId: s.project_id || projectId,
      name: s.canonical_name || s.name,
      category: s.category || 'TECHNICAL',
      severity: s.severity || 'MEDIUM',
      direction: s.polarity || s.direction || 'NEGATIVE',
      trend: s.risk_trend || (s.status === 'IMPROVING' ? 'DECREASING' : 'INCREASING'),
      confidence: toPercent(s.signal_confidence ?? s.confidence),
      metricChange: s.metric_change || (s.current_value !== undefined && s.baseline_value !== undefined
        ? `${s.baseline_value} -> ${s.current_value}${s.unit ? ' ' + s.unit : ''} (${s.baseline_to_current_change_percent !== undefined ? (s.baseline_to_current_change_percent > 0 ? '+' : '') + s.baseline_to_current_change_percent + '%' : ''})`
        : 'Observed anomaly'),
      supportingEvidenceIds: s.supporting_evidence_ids || [],
      supportingRelationshipIds: s.supporting_relationship_ids || [],
      historicalPrevalence: typeof s.historical_prevalence === 'number' ? s.historical_prevalence : 0,
      description: s.summary || s.explanation || s.description || '',
      signalStrength: toPercent(s.signal_strength),
      status: s.status,
      signalType: s.signal_type,
      riskScore: typeof s.risk_score === 'number' ? s.risk_score : null,
      previousRiskScore: typeof s.previous_risk_score === 'number' ? s.previous_risk_score : null,
      baselineRiskScore: typeof s.baseline_risk_score === 'number' ? s.baseline_risk_score : null,
      riskChangePercent: typeof s.risk_change_percent === 'number' ? s.risk_change_percent : null,
      riskTrend: s.risk_trend || null,
      scoringMethod: s.scoring_method || null,
      polarity: s.polarity || null,
      benchmarkTarget: typeof s.benchmark_target === 'number' ? s.benchmark_target : null,
      benchmarkCritical: typeof s.benchmark_critical === 'number' ? s.benchmark_critical : null,
      unit: s.unit || null,
      baselineValue: typeof s.baseline_value === 'number' ? s.baseline_value : null,
      previousValue: typeof s.previous_value === 'number' ? s.previous_value : null,
      currentValue: typeof s.current_value === 'number' ? s.current_value : null,
      baselineTimestamp: s.baseline_timestamp || null,
      previousTimestamp: s.previous_timestamp || null,
      currentTimestamp: s.current_timestamp || null,
      baselineToCurrentChangePercent: typeof s.baseline_to_current_change_percent === 'number' ? s.baseline_to_current_change_percent : null,
      previousToCurrentChangePercent: typeof s.previous_to_current_change_percent === 'number' ? s.previous_to_current_change_percent : null,
      metricChangePercent: typeof s.metric_change_percent === 'number' ? s.metric_change_percent : null,
      metricTrend: s.metric_trend || null,
      explanation: s.explanation || null,
    }));

    return apiSuccess({
      analysisId: backendData.analysis_id && backendData.analysis_id !== 'none'
        ? backendData.analysis_id
        : null,
      signals: mappedSignals,
      riskDimensions: backendData.risk_dimensions || [],
      packet: backendData,
    });
  } catch (error) {
    return apiError(error, 'Unable to retrieve project operational signals.');
  }
}
