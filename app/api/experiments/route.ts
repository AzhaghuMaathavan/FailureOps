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

    authorizeProjectAccess(session, projectId);

    const backendResp = await fetch(
      `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/experiments`,
      {
        headers: {
          'x-organization-id': session.organizationId,
          'x-user-id': session.userId,
        },
        cache: 'no-store',
      }
    );

    if (!backendResp.ok) {
      throw new Error(`Backend experiments returned HTTP ${backendResp.status}`);
    }

    const data = await backendResp.json();
    return apiSuccess(data);
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
    const action = body.action || 'simulate';

    authorizeProjectAccess(session, projectId);

    let endpointUrl = `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/simulate`;
    let method = 'POST';
    let payloadBody: any = undefined;

    if (action === 'start' && body.experimentId) {
      endpointUrl = `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/experiments/${encodeURIComponent(body.experimentId)}/start`;
    } else if (action === 'verify' && body.experimentId) {
      endpointUrl = `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/experiments/${encodeURIComponent(body.experimentId)}/verify`;
      payloadBody = JSON.stringify(body.measuredMetrics || {});
    }

    const backendResp = await fetch(endpointUrl, {
      method,
      headers: {
        'x-organization-id': session.organizationId,
        'x-user-id': session.userId,
        'Content-Type': 'application/json',
      },
      body: payloadBody,
    });

    if (!backendResp.ok) {
      throw new Error(`Backend experiment action failed with HTTP ${backendResp.status}`);
    }

    const respData = await backendResp.json();
    return apiSuccess(respData);
  } catch (error) {
    return apiError(error, 'Unable to execute experiment action.');
  }
}


