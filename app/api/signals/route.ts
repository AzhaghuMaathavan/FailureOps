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

    // Verify multi-tenant authorization
    authorizeProjectAccess(session, projectId);

    // Attempt to query real backend microservice first
    try {
      const backendResp = await fetch(
        `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/signals`,
        {
          headers: {
            'x-organization-id': session.organizationId,
            'x-user-id': session.userId,
          },
          signal: AbortSignal.timeout(3000),
        }
      );

      if (backendResp.ok) {
        const backendData = await backendResp.json();
        if (backendData.signals && backendData.signals.length > 0) {
          const mappedSignals: Signal[] = backendData.signals.map((s: any) => ({
            id: s.signal_id,
            projectId: s.project_id,
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
        }
      }
    } catch (fetchErr) {
      // Backend offline or unreachable in local client-only runtime
    }

    // If backend is offline, check fallback demo signals for Project Aurora
    if (projectId === 'aurora') {
      const { mockSignals } = await import('@/data/mockSignals');
      return apiSuccess(mockSignals);
    }

    return apiSuccess([]);
  } catch (error) {
    return apiError(error, 'Unable to retrieve project operational signals.');
  }
}
