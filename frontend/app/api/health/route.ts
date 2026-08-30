export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/server/response';
import { ragFetch, RagUnreachableError } from '@/lib/server/rag';
import { getServerSession } from '@/lib/server/auth';
import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  let backend: { reachable: boolean; status?: string } = { reachable: false };
  try {
    const health = await ragFetch<{ status?: string }>('/api/v1/health', getServerSession(req));
    backend = { reachable: true, status: health.status || 'ok' };
  } catch (error) {
    backend = {
      reachable: false,
      status: error instanceof RagUnreachableError ? 'unreachable' : 'error',
    };
  }

  const overall = backend.reachable && backend.status === 'ok' ? 'ok' : 'degraded';

  return apiSuccess({
    status: overall,
    service: 'FailureOps',
    backendUrlConfigured: Boolean(serverConfig.backendInternalUrl),
    backend,
  });
}
