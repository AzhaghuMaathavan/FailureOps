export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { executeLangGraphRun } from '@/lib/langgraph/graph';
import { createRunId, getLatestRun, putRun } from '@/lib/langgraph/store';
import { emptyPhases, StagedUploadFile, UploadMetadata } from '@/lib/langgraph/types';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const projectId = req.nextUrl.searchParams.get('projectId') || 'aurora';
    authorizeProjectAccess(session, projectId);
    return apiSuccess(getLatestRun(projectId));
  } catch (error) {
    return apiError(error, 'Unable to load LangGraph run status.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'analysis');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const form = await req.formData();
    const projectId = String(form.get('projectId') || 'aurora');
    authorizeProjectAccess(session, projectId);

    let metadata: UploadMetadata[] = [];
    const rawMeta = form.get('metadata');
    if (typeof rawMeta === 'string' && rawMeta.trim()) {
      const parsed = JSON.parse(rawMeta);
      if (!Array.isArray(parsed)) throw new Error('metadata must be an array');
      metadata = parsed;
    }

    const incoming = form.getAll('files').filter((entry) => typeof entry !== 'string') as File[];
    if (incoming.length === 0) throw new Error('At least one file is required');

    const staged: StagedUploadFile[] = [];
    for (let index = 0; index < incoming.length; index += 1) {
      const file = incoming[index];
      const meta = metadata[index] || {};
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length === 0) throw new Error(`${file.name} is empty`);
      staged.push({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        bytes,
        title: String(meta.title || file.name).slice(0, 120),
        documentType: String(meta.documentType || 'PROJECT_DOC'),
        description: String(meta.description || '').slice(0, 500),
        visibility: meta.visibility === 'ORGANIZATION' ? 'ORGANIZATION' : 'PRIVATE',
        department: String(meta.department || '').slice(0, 80),
      });
    }

    const runId = createRunId();
    const now = new Date().toISOString();
    const snapshot = putRun(
      {
        runId,
        projectId,
        status: 'QUEUED',
        currentPhase: 'upload',
        phases: emptyPhases(),
        documents: [],
        documentIds: [],
        analysisId: null,
        evidenceCount: 0,
        signalCount: 0,
        error: null,
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        totalLatencyMs: null,
      },
      staged
    );

    void executeLangGraphRun(runId, session);

    return apiSuccess(snapshot, 202);
  } catch (error) {
    return apiError(error, 'Failed to start LangGraph document pipeline.');
  }
}
