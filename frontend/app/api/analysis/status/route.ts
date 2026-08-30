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
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId') || searchParams.get('analysisId') || '';
    const projectId = searchParams.get('projectId') || 'aurora';

    if (!jobId) {
      return apiError(new Error('Missing jobId parameter'), 'jobId is required.');
    }

    const backendStatus = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(jobId)}`,
      session
    );
    const progress = backendStatus.progress_percent || 0;
    const isDone = backendStatus.status === 'COMPLETED';
    const isFailed = backendStatus.status === 'FAILED';
    const stages = mapRagAnalysisStages(backendStatus.status, isDone, isFailed);

    console.info('[FAILUREOPS] Analysis status', {
      analysisId: backendStatus.analysis_id,
      status: backendStatus.status,
      progress,
      currentStage: backendStatus.current_stage,
    });

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
    });
  } catch (error) {
    return apiError(error, 'Unable to query analysis job status from backend.');
  }
}
