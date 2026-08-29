export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ProjectRegistrationSchema } from '@/lib/validation/schemas';
import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const resp = await fetch(`${serverConfig.ragInternalUrl}/api/v1/projects`, {
      headers: {
        'x-organization-id': session.organizationId,
        'x-user-id': session.userId,
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      throw new Error(`Backend returned HTTP ${resp.status}`);
    }

    const projects = await resp.json();
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

    const resp = await fetch(`${serverConfig.ragInternalUrl}/api/v1/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': session.organizationId,
        'x-user-id': session.userId,
      },
      body: JSON.stringify(validated),
    });

    if (!resp.ok) {
      const errDetail = await resp.text();
      throw new Error(`Backend registration failed (${resp.status}): ${errDetail}`);
    }

    const createdProject = await resp.json();
    return apiSuccess(createdProject, 201);
  } catch (error) {
    return apiError(error, 'Failed to register project in database.');
  }
}

