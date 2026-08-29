export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch, mapRagHit } from '@/lib/server/rag';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'analysis');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const projectId = body.projectId || 'aurora';
    const query = String(body.query || '').trim();

    if (!query) {
      throw new Error('Query is required');
    }

    authorizeProjectAccess(session, projectId);

    const raw = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/ask`,
      session,
      {
        method: 'POST',
        body: JSON.stringify({
          query,
          conversation_id: body.conversationId,
        }),
      }
    );

    return apiSuccess({
      projectId,
      answer: raw.answer || '',
      sources: (raw.sources || []).map((s: any) => ({
        document: s.document,
        page: s.page,
        chunkId: s.chunk_id,
      })),
      citations: (raw.citations || []).map((c: any) => ({
        documentId: c.document_id,
        lineage: c.lineage || {},
        filename: c.lineage?.document_name,
      })),
      hits: (raw.retrieved_evidence || raw.evidence || []).map(mapRagHit),
      conversationId: raw.conversation_id,
      domainState: raw.domain_state,
      evidenceState: raw.evidence_state,
    });
  } catch (error) {
    return apiError(error, 'Unable to answer from the project knowledge base.');
  }
}
