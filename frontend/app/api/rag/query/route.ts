export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'analysis');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const projectId = body.project_id || body.projectId || 'aurora';
    const query = String(body.query || '').trim();

    if (!query) {
      throw new Error('Query is required');
    }

    authorizeProjectAccess(session, projectId);

    const raw = await ragFetch<{
      answer?: string;
      sources?: { document?: string; page?: number; chunk_id?: string }[];
      citations?: any[];
      retrieved_evidence?: any[];
      evidence_state?: string;
      domain_state?: string;
    }>('/api/rag/query', session, {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        query,
        conversation_id: body.conversation_id || body.conversationId,
      }),
    });

    return apiSuccess({
      answer: raw.answer || '',
      sources: raw.sources || [],
      citations: raw.citations || [],
      evidenceState: raw.evidence_state,
      domainState: raw.domain_state,
      projectId,
    });
  } catch (error) {
    return apiError(error, 'RAG query failed.');
  }
}
