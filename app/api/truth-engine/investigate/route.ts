export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { TruthEngineQuerySchema } from '@/lib/validation/schemas';
import { investigateAssumption } from '@/data/mockAssumptions';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'search');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = TruthEngineQuerySchema.parse(body);

    authorizeProjectAccess(session, validated.projectId);

    const result = investigateAssumption(validated.assumptionText);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error, 'Failed to execute truth engine claim investigation.');
  }
}
