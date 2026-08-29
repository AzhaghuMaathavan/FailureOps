export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';
import { INITIAL_ANALYSIS_STAGES } from '@/services/analysisService';

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

    const resp = await fetch(
      `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(jobId)}`,
      {
        headers: {
          'x-organization-id': session.organizationId,
          'x-user-id': session.userId,
        },
        cache: 'no-store',
      }
    );

    if (!resp.ok) {
      throw new Error(`Backend returned HTTP ${resp.status}`);
    }

    const backendStatus = await resp.json();
    const progress = backendStatus.progress_percent || 0;
    const isDone = backendStatus.status === 'COMPLETED';

    // Map stages based on real progress
    const stages = INITIAL_ANALYSIS_STAGES.map((s, idx) => {
      const stageThreshold = (idx + 1) * (100 / INITIAL_ANALYSIS_STAGES.length);
      const stageStart = idx * (100 / INITIAL_ANALYSIS_STAGES.length);

      if (isDone || progress >= stageThreshold) {
        return { ...s, status: 'COMPLETED' as const, progress: 100 };
      } else if (progress > stageStart) {
        const stageProg = Math.min(99, Math.round(((progress - stageStart) / (stageThreshold - stageStart)) * 100));
        return { ...s, status: 'IN_PROGRESS' as const, progress: stageProg };
      } else {
        return { ...s, status: 'PENDING' as const, progress: 0 };
      }
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
      resultSummary: backendStatus.summary,
    });
  } catch (error) {
    return apiError(error, 'Unable to query analysis job status from backend.');
  }
}

