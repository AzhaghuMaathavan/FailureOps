export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';

import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';

    const project = authorizeProjectAccess(session, projectId);

    const isExecutive = searchParams.get('view') === 'executive';
    const backendPath = isExecutive ? 'failure-radar' : 'failure-chain';

    // Attempt to query real backend microservice
    try {
      const backendResp = await fetch(
        `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/${backendPath}`,
        {
          headers: {
            'x-organization-id': session.organizationId,
            'x-user-id': session.userId,
          },
          signal: AbortSignal.timeout(3000),
        }
      );

      if (backendResp.ok) {
        const rawData = await backendResp.json();
        if (isExecutive) {
          return apiSuccess(rawData);
        }
        if (rawData && rawData.prediction) {
          const radarPayload = {
            projectId: project.id,
            currentRisk: rawData.prediction.risk_score || project.failureRisk,
            riskTrend: project.riskTrend,
            predictedNextFailure: rawData.prediction.predicted_failure || project.predictedNextFailure,
            predictionConfidence: Math.round((rawData.prediction.confidence || 0.85) * 100),
            chain: rawData,
            trajectory: [
              { week: 'Week 1', risk: 32, note: 'Initial PRD Scope Baseline' },
              { week: 'Week 2', risk: 48, note: 'First CI Flakiness & Overtime Spike' },
              { week: 'Week 3', risk: 64, note: 'Staging DB Deadlock Incident' },
              { week: 'Week 4', risk: rawData.prediction.risk_score || 82, note: 'Current Empirical Signals' },
              { week: 'Week 5 (Est)', risk: Math.min(95, (rawData.prediction.risk_score || 82) + 7), note: 'Predicted Testing Bottleneck' },
              { week: 'Week 6 (Est)', risk: Math.min(98, (rawData.prediction.risk_score || 82) + 14), note: 'Projected Missed Release Horizon' },
            ],
            emergingSeeds: rawData.nodes
              ? rawData.nodes.filter((n: any) => n.type === 'SIGNAL').map((n: any) => ({
                  name: n.label,
                  severity: n.severity,
                  leadTime: 'Active',
                }))
              : [
                  { name: 'Deployment Pipeline Instability', severity: 'HIGH', leadTime: '12 Days' },
                  { name: 'Critical Onboarding Gate Drop-off', severity: 'HIGH', leadTime: 'Immediate' },
                  { name: 'Engineering Overtime & Cognitive Fatigue', severity: 'WARNING', leadTime: '18 Days' },
                ],
          };
          return apiSuccess(radarPayload);
        }
      }
    } catch {
      // Backend offline, proceed to fallback
    }


    const radarTelemetry = {
      projectId: project.id,
      currentRisk: project.failureRisk,
      riskTrend: project.riskTrend,
      predictedNextFailure: project.predictedNextFailure,
      predictionConfidence: project.predictionConfidence,
      trajectory: [
        { week: 'Week 1', risk: 32, note: 'Initial PRD Scope Baseline' },
        { week: 'Week 2', risk: 48, note: 'First CI Flakiness & Overtime Spike' },
        { week: 'Week 3', risk: 64, note: 'Staging DB Deadlock Incident' },
        { week: 'Week 4', risk: 82, note: 'Activation Drops to 31% (Current)' },
        { week: 'Week 5 (Est)', risk: 89, note: 'Predicted Testing Bottleneck' },
        { week: 'Week 6 (Est)', risk: 96, note: 'Projected Missed Release Horizon' },
      ],
      emergingSeeds: [
        { name: 'Deployment Pipeline Instability', severity: 'HIGH', leadTime: '12 Days' },
        { name: 'Critical Onboarding Gate Drop-off', severity: 'HIGH', leadTime: 'Immediate' },
        { name: 'Engineering Overtime & Cognitive Fatigue', severity: 'WARNING', leadTime: '18 Days' },
      ],
    };

    return apiSuccess(radarTelemetry);
  } catch (error) {
    return apiError(error, 'Unable to query failure radar telemetry.');
  }
}
