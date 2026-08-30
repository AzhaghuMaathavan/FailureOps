export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/server/response';
import { ragFetch, RagUnreachableError } from '@/lib/server/rag';
import { getServerSession } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    const health = await ragFetch<{ status: string; database: string; pgvector?: boolean }>(
      '/health/db',
      getServerSession(req)
    );
    return apiSuccess({
      status: health.status,
      database: health.database,
      pgvector: health.pgvector === true,
    });
  } catch (error) {
    if (error instanceof RagUnreachableError) {
      return apiError(error, 'Backend is unreachable; database health could not be verified.');
    }
    return apiError(error, 'Database health check failed.');
  }
}
