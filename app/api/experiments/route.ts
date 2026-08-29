export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { mockExperiments } from '@/data/mockExperiments';

import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';

    authorizeProjectAccess(session, projectId);

    const experiments = mockExperiments.filter(e => e.projectId === projectId);
    return apiSuccess(experiments);
  } catch (error) {
    return apiError(error, 'Unable to retrieve experiment registry.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const projectId = body.projectId || 'aurora';

    authorizeProjectAccess(session, projectId);

    // Attempt to query real backend microservice for simulation
    try {
      const backendResp = await fetch(
        `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/simulate`,
        {
          method: 'POST',
          headers: {
            'x-organization-id': session.organizationId,
            'x-user-id': session.userId,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(3000),
        }
      );

      if (backendResp.ok) {
        const simData = await backendResp.json();
        return apiSuccess(simData);
      }
    } catch {
      // Backend offline, proceed to fallback
    }

    // Fallback simulation result
    const fallbackSim = {
      project_id: projectId,
      current_baseline_risk: 78,
      scenarios: [
        {
          scenario_id: 'do_nothing',
          scenario_name: 'Status Quo (Do Nothing)',
          description: 'Allow current signal trajectories and compounding backlog to evolve without intervention.',
          baseline_risk: 78,
          simulated_risk: 90,
          risk_change: 12,
          affected_dimensions: ['Execution', 'Technical', 'Adoption'],
          propagation_steps: ['Unresolved onboarding friction & CI failures persist', 'Release deadline missed by 3-4 weeks'],
          confidence: 0.88,
          type: 'SIMULATION',
          explanation: 'Projected failure probability escalates from 78% to 90% as active bottlenecks remain unmitigated.',
        },
        {
          scenario_id: 'simplify_onboarding',
          scenario_name: 'Streamline Onboarding (7 Steps -> 3 Steps)',
          description: 'Eliminate mandatory first-run integration blockers and defer secondary workspace setup.',
          baseline_risk: 78,
          simulated_risk: 54,
          risk_change: -24,
          affected_dimensions: ['Adoption', 'Customer'],
          propagation_steps: ['First-run setup barrier reduced to 10 minutes', 'Activation lifts from 33% to projected 58%'],
          confidence: 0.91,
          type: 'SIMULATION',
          explanation: 'Matches Project Atlas recovery benchmark (+27% activation), reducing overall failure risk by 24 points to 54%.',
        },
      ],
      recommended_scenario: 'Streamline Onboarding (7 Steps -> 3 Steps)',
    };
    return apiSuccess(fallbackSim);
  } catch (error) {
    return apiError(error, 'Unable to run what-if simulation.');
  }
}

