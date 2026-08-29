export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/server/response';
import { ragFetch, RagUnreachableError } from '@/lib/server/rag';
import { getServerSession } from '@/lib/server/auth';
import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  let rag: { reachable: boolean; status?: string } = { reachable: false };
  try {
    const health = await ragFetch<any>('/api/v1/health', getServerSession(req));
    rag = { reachable: true, status: health.status };
  } catch (error) {
    rag = {
      reachable: false,
      status: error instanceof RagUnreachableError ? 'unreachable' : 'error',
    };
  }

  return apiSuccess({
    status: 'ok',
    service: 'FailureOps',
    ragInternalUrlConfigured: Boolean(serverConfig.ragInternalUrl),
    rag,
  });
}
