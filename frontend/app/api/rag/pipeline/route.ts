export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    authorizeProjectAccess(session, projectId);

    const [snapshot, ragHealth] = await Promise.all([
      ragFetch<any>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/pipeline`,
        session
      ),
      ragFetch<any>('/api/v1/health', session).catch(() => null),
    ]);

    const rustfs = snapshot.storage_health || ragHealth?.rustfs || {};
    const database = String(ragHealth?.database || '');
    const health = {
      reachable: true,
      ragStatus: ragHealth?.status || 'ok',
      database: ragHealth?.database,
      vectorStore: database === 'connected' || database.startsWith('connected'),
      rustfsReachable: rustfs.reachable === true,
      rustfsProvider: rustfs.provider,
      rustfsBucket: rustfs.bucket,
      embeddingProviderConfigured: ragHealth?.embedding_provider_configured === true,
      llmProviderConfigured: ragHealth?.llm_provider_configured === true,
    };

    console.info('[FAILUREOPS] Pipeline snapshot', {
      projectId,
      documents: snapshot.totals?.documents,
      bytes: snapshot.totals?.bytes,
      pages: snapshot.totals?.pages,
      chunks: snapshot.totals?.chunks,
      embedded: snapshot.totals?.embedded,
      evidence: snapshot.totals?.evidence,
      signals: snapshot.totals?.signals,
    });

    return apiSuccess({
      projectId,
      health,
      documents: snapshot.documents || [],
      totals: snapshot.totals || {},
      evidenceAnalysisId: snapshot.analysis_id || null,
      signalAnalysisId: snapshot.analysis_id || null,
      metrics: snapshot.metrics || {},
      stages: snapshot.stages || [],
      storageHealth: rustfs,
      analysisStatus: snapshot.analysis_status || null,
    });
  } catch (error) {
    return apiError(error, 'Unable to load RAG pipeline state.');
  }
}
