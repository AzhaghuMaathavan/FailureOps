export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { INITIAL_ANALYSIS_STAGES } from '@/services/analysisService';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId') || 'JOB-ACTIVE';

    return apiSuccess({
      jobId,
      status: 'COMPLETED',
      stages: INITIAL_ANALYSIS_STAGES.map(s => ({ ...s, status: 'COMPLETED' })),
      completedAt: new Date().toISOString(),
      resultSummary: {
        failureRisk: 82,
        dominantArchetype: 'The Premature Scope & Fragile Velocity Trap',
        predictedFailure: 'Missed Beta Release',
      },
    });
  } catch (error) {
    return apiError(error, 'Unable to query analysis job status.');
  }
}
