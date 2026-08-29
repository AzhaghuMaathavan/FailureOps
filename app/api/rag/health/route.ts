export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch, RagUnreachableError } from '@/lib/server/rag';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const health = await ragFetch<any>('/api/v1/health', session);
    const database = String(health.database || '');
    const databaseConnected = database === 'connected' || database.startsWith('connected');

    console.info('[FAILUREOPS] RAG health', { database: health.database, status: health.status });

    return apiSuccess({
      reachable: true,
      service: health.service || 'RAG',
      ragStatus: health.status || 'ok',
      database: health.database,
      vectorStore: databaseConnected,
    });
  } catch (error) {
    if (error instanceof RagUnreachableError) {
      return apiSuccess({
        reachable: false,
        service: 'RAG',
        ragStatus: 'unreachable',
        database: 'unknown',
        vectorStore: false,
        error: 'RAG unavailable',
      });
    }
    return apiError(error, 'Unable to query RAG health.');
  }
}
