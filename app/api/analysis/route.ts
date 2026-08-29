export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { AnalysisJobSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    // Strict rate limit on expensive AI analysis
    const rate = checkRateLimit(req, 'analysis');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = AnalysisJobSchema.parse(body);

    // Verify tenant authorization before queuing analysis job
    authorizeProjectAccess(session, validated.projectId);

    // Create asynchronous reasoning job (prevents connection timeout abuse)
    const job = {
      jobId: `JOB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      projectId: validated.projectId,
      status: 'DISPATCHED',
      totalStages: 10,
      createdAt: new Date().toISOString(),
      estimatedDurationSeconds: 12,
    };

    return apiSuccess(job, 202);
  } catch (error) {
    return apiError(error, 'Failed to dispatch project analysis job.');
  }
}
