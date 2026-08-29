export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';
import { Signal } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    const analysisId = searchParams.get('analysisId');

    // Verify multi-tenant authorization
    authorizeProjectAccess(session, projectId);

    const endpointUrl = analysisId
      ? `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(analysisId)}/signals`
      : `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/signals`;

    const backendResp = await fetch(endpointUrl, {
      headers: {
        'x-organization-id': session.organizationId,
        'x-user-id': session.userId,
      },
      cache: 'no-store',
    });

    if (!backendResp.ok) {
      throw new Error(`Backend signals returned HTTP ${backendResp.status}`);
    }

    const backendData = await backendResp.json();
    const rawSignals = backendData.signals || [];
    
    const mappedSignals: Signal[] = rawSignals.map((s: any) => ({
      id: s.signal_id,
      projectId: s.project_id || projectId,
      name: s.name,
      category: s.category,
      severity: s.severity || 'MEDIUM',
      direction: s.polarity || 'NEGATIVE',
      trend: s.status === 'IMPROVING' ? 'DECREASING' : 'INCREASING',
      confidence: Math.round((s.signal_confidence || 0.9) * 100),
      metricChange: s.metric_change || 'Observed anomaly',
      supportingEvidenceIds: s.supporting_evidence_ids || [],
      supportingRelationshipIds: s.supporting_relationship_ids || [],
      historicalPrevalence: s.historical_prevalence || 85,
      description: s.summary,
      signalStrength: Math.round((s.signal_strength || 0.85) * 100),
      status: s.status,
      signalType: s.signal_type,
    }));

    return apiSuccess(mappedSignals);
  } catch (error) {
    return apiError(error, 'Unable to retrieve project operational signals.');
  }
}

