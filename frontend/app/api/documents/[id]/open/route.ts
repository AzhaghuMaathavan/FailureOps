export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const resolvedParams = await params;
    const documentId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || searchParams.get('project_id') || 'aurora';
    const page = searchParams.get('page');

    if (projectId) {
      authorizeProjectAccess(session, projectId);
    }

    const downloadUrl = `/api/documents/${encodeURIComponent(documentId)}/download?projectId=${encodeURIComponent(projectId)}${
      page ? `#page=${page}` : ''
    }`;

    return apiSuccess({
      signed_url: downloadUrl,
      redirect_url: downloadUrl,
      document_id: documentId,
      project_id: projectId,
    });
  } catch (error) {
    return apiError(error, 'Unable to open document.');
  }
}
