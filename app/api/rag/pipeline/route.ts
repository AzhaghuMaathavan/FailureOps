export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

function stage(
  key: string,
  label: string,
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED',
  detail: string,
  count?: number,
  error?: string | null
) {
  return { key, label, status, detail, count, error: error || null };
}

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    authorizeProjectAccess(session, projectId);

    const health = await ragFetch<any>('/api/v1/health', session);
    const docs = await ragFetch<any[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/documents`,
      session
    );
    const evidence = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/evidence`,
      session
    );
    const signals = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/signals`,
      session
    );

    const documents = Array.isArray(docs) ? docs : [];
    const chunkCount = documents.reduce((sum, d) => sum + Number(d.chunk_count || 0), 0);
    const embeddedCount = documents.reduce((sum, d) => sum + Number(d.embedded_count || 0), 0);
    const failedDocs = documents.filter((d) => d.status === 'FAILED');
    const processingDocs = documents.filter(
      (d) => d.status === 'PENDING' || d.status === 'PROCESSING'
    );
    const readyDocs = documents.filter(
      (d) => d.status === 'COMPLETED' || d.status === 'PARTIAL_SUCCESS'
    );
    const evidenceItems = evidence?.evidence || [];
    const signalItems = signals?.signals || [];
    const metrics = evidence?.metrics || {};
    const evidenceAnalysisId = evidence?.analysis_id;
    const signalAnalysisId = signals?.analysis_id;
    const hasCompletedAnalysis =
      (evidenceAnalysisId && evidenceAnalysisId !== 'none') ||
      (signalAnalysisId && signalAnalysisId !== 'none');

    const ingestError = failedDocs[0]?.error_message || null;
    const receivedStatus = documents.length > 0 ? 'COMPLETED' : 'PENDING';
    const parsedStatus = failedDocs.length
      ? 'FAILED'
      : processingDocs.length
        ? 'RUNNING'
        : readyDocs.length
          ? 'COMPLETED'
          : documents.length
            ? 'RUNNING'
            : 'PENDING';
    const chunkStatus = failedDocs.length && chunkCount === 0
      ? 'FAILED'
      : processingDocs.length && chunkCount === 0
        ? 'RUNNING'
        : chunkCount > 0
          ? 'COMPLETED'
          : documents.length
            ? 'PENDING'
            : 'PENDING';
    const embedStatus =
      chunkCount > 0 && embeddedCount === chunkCount
        ? 'COMPLETED'
        : chunkCount > 0 && (processingDocs.length || embeddedCount > 0)
          ? 'RUNNING'
          : chunkCount > 0 && readyDocs.length && embeddedCount === 0
            ? 'FAILED'
            : 'PENDING';
    const indexStatus =
      embedStatus === 'COMPLETED' && processingDocs.length === 0 ? 'COMPLETED' : embedStatus;
    const retrievalStatus = hasCompletedAnalysis
      ? Number(metrics.total_chunks_searched || 0) > 0
        ? 'COMPLETED'
        : 'COMPLETED'
      : chunkCount > 0
        ? 'PENDING'
        : 'PENDING';
    const evidenceStatus = hasCompletedAnalysis
      ? 'COMPLETED'
      : chunkCount > 0
        ? 'PENDING'
        : 'PENDING';
    const signalStatus = hasCompletedAnalysis ? 'COMPLETED' : evidenceStatus;

    const stages = [
      stage('received', 'Document received', receivedStatus, `${documents.length} document(s)`),
      stage(
        'parser',
        'Parser',
        parsedStatus,
        parsedStatus === 'FAILED' ? 'Parsing failed' : `${readyDocs.length} parsed`,
        readyDocs.length,
        ingestError
      ),
      stage('chunking', 'Chunking', chunkStatus, `${chunkCount} chunks`, chunkCount, ingestError),
      stage(
        'embedding',
        'Embedding',
        embedStatus,
        `${embeddedCount}/${chunkCount} embeddings`,
        embeddedCount,
        embedStatus === 'FAILED' ? 'Embeddings did not complete. Check NVIDIA embed keys and RAG logs.' : null
      ),
      stage(
        'vector',
        'Vector storage',
        indexStatus,
        `${embeddedCount} vectors`,
        embeddedCount
      ),
      stage(
        'retrieval',
        'Retrieval',
        retrievalStatus,
        hasCompletedAnalysis
          ? `${metrics.total_chunks_searched || 0} chunks searched`
          : 'Run project analysis to retrieve evidence',
        Number(metrics.total_chunks_searched || 0)
      ),
      stage(
        'evidence',
        'Evidence Agent',
        evidenceStatus,
        hasCompletedAnalysis
          ? `${evidenceItems.length} evidence items`
          : 'Waiting for analysis',
        evidenceItems.length
      ),
      stage(
        'signals',
        'Signal Agent',
        signalStatus,
        hasCompletedAnalysis
          ? `${signalItems.length} signals`
          : 'Waiting for analysis',
        signalItems.length
      ),
    ];

    console.info('[FAILUREOPS] Pipeline snapshot', {
      projectId,
      documents: documents.length,
      chunks: chunkCount,
      embedded: embeddedCount,
      evidence: evidenceItems.length,
      signals: signalItems.length,
    });

    return apiSuccess({
      projectId,
      health: {
        reachable: true,
        ragStatus: health.status,
        database: health.database,
        vectorStore: String(health.database || '').startsWith('connected'),
      },
      documents,
      totals: {
        documents: documents.length,
        chunks: chunkCount,
        embedded: embeddedCount,
        evidence: evidenceItems.length,
        signals: signalItems.length,
        chunksSearched: Number(metrics.total_chunks_searched || 0),
      },
      evidenceAnalysisId: evidenceAnalysisId === 'none' ? null : evidenceAnalysisId || null,
      signalAnalysisId: signalAnalysisId === 'none' ? null : signalAnalysisId || null,
      metrics,
      stages,
    });
  } catch (error) {
    return apiError(error, 'Unable to load RAG pipeline state.');
  }
}
