export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ProjectRegistrationSchema } from '@/lib/validation/schemas';
import { ragFetch } from '@/lib/server/rag';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const projects = await ragFetch<any>('/api/v1/projects', session);
    return apiSuccess(projects);
  } catch (error) {
    return apiError(error, 'Unable to retrieve authorized project portfolio from backend.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'upload');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = ProjectRegistrationSchema.parse(body);

    const createdProject = await ragFetch<any>('/api/v1/projects', session, {
      method: 'POST',
      body: JSON.stringify(validated),
    });
    return apiSuccess(createdProject, 201);
  } catch (error) {
    return apiError(error, 'Failed to register project in database.');
  }
}
