export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';
import { mapRagAnalysisStages } from '@/services/analysisService';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    // Use dedicated high-capacity status rate-limiting tier
    const rate = checkRateLimit(req, 'status');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    let jobId = searchParams.get('jobId') || searchParams.get('analysisId') || '';
    const projectId = searchParams.get('projectId') || 'aurora';

    const targetJobId = jobId || 'latest';
    let backendStatus: any = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(targetJobId)}`,
      session
    ).catch(() => null);

    if (!backendStatus) {
      // Fetch latest project status / pipeline overview as fallback
      const pipelineData = await ragFetch<any>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/pipeline`,
        session
      ).catch(() => null);

      if (pipelineData && pipelineData.analysis_id) {
        backendStatus = await ragFetch<any>(
          `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(pipelineData.analysis_id)}`,
          session
        ).catch(() => null);
      }
    }

    if (!backendStatus) {
      // Return clean idle/not-started state instead of hard failing
      return apiSuccess({
        jobId: null,
        analysisId: null,
        projectId,
        status: 'IDLE',
        currentStage: 'NOT_STARTED',
        progressPercent: 0,
        stages: mapRagAnalysisStages('NOT_STARTED', false, false),
        completedAt: null,
        errorMessage: null,
        resultSummary: null,
      });
    }

    const progress = backendStatus.progress_percent || 0;
    const isDone = backendStatus.status === 'COMPLETED';
    const isFailed = backendStatus.status === 'FAILED';
    const stages = mapRagAnalysisStages(backendStatus.current_stage || backendStatus.status, isDone, isFailed);

    return apiSuccess({
      jobId: backendStatus.analysis_id,
      analysisId: backendStatus.analysis_id,
      projectId: backendStatus.project_id,
      status: backendStatus.status,
      currentStage: backendStatus.current_stage,
      progressPercent: progress,
      stages,
      completedAt: backendStatus.completed_at,
      errorMessage: backendStatus.error_message,
      resultSummary: backendStatus.metrics || null,
      retryable: backendStatus.status === 'FAILED',
    });
  } catch (error) {
    return apiError(error, 'Unable to query analysis job status.');
  }
}
