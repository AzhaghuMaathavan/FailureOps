export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { id } = await params;

    // Anti-IDOR check
    authorizeProjectAccess(session, id);

    const resp = await fetch(`${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(id)}`, {
      headers: {
        'x-organization-id': session.organizationId,
        'x-user-id': session.userId,
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      if (resp.status === 404) {
        throw new Error('NOT_FOUND');
      }
      throw new Error(`Backend returned HTTP ${resp.status}`);
    }

    const project = await resp.json();
    return apiSuccess(project);
  } catch (error) {
    return apiError(error, 'Unable to retrieve project details.');
  }
}

