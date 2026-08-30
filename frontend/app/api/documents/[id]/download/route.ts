export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';
import { ragHeaders } from '@/lib/server/rag';

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
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');

    if (projectId) {
      authorizeProjectAccess(session, projectId);
    }

    const backendUrl = `${serverConfig.ragInternalUrl}/api/v1/documents/${encodeURIComponent(documentId)}/download${
      projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
    }`;

    const headers = ragHeaders(session);
    const resp = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Document download failed');
      return new NextResponse(errText, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = resp.headers.get('Content-Type') || 'application/octet-stream';
    const contentDisposition = resp.headers.get('Content-Disposition') || `inline; filename="${documentId}"`;
    const body = await resp.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    return apiError(error, 'Unable to download source document.');
  }
}
