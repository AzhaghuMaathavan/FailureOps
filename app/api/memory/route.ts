export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { SaveMemorySchema } from '@/lib/validation/schemas';
import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';
    const view = searchParams.get('view');
    const pattern = searchParams.get('pattern');

    const endpointPath = view === 'historical'
      ? `/api/v1/projects/${encodeURIComponent(projectId)}/historical-cases`
      : `/api/v1/projects/${encodeURIComponent(projectId)}/organizational-memory${pattern ? `?pattern=${encodeURIComponent(pattern)}` : ''}`;

    const backendResp = await fetch(
      `${serverConfig.ragInternalUrl}${endpointPath}`,
      {
        headers: {
          'x-organization-id': session.organizationId,
          'x-user-id': session.userId,
        },
        cache: 'no-store',
      }
    );

    if (!backendResp.ok) {
      throw new Error(`Backend memory returned HTTP ${backendResp.status}`);
    }

    const memoryData = await backendResp.json();
    return apiSuccess(memoryData);
  } catch (error) {
    return apiError(error, 'Unable to load organizational memory vault.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'upload');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = SaveMemorySchema.parse(body);

    const newEntry = {
      id: `mem-${Math.random().toString(36).substring(2, 6)}`,
      pattern: validated.pattern,
      evidenceSummary: validated.evidenceSummary,
      intervention: validated.intervention,
      experimentDesign: validated.experimentDesign,
      outcome: validated.outcome,
      confidence: validated.confidence,
      context: validated.context,
      tags: validated.tags,
      verifiedAt: new Date().toISOString().slice(0, 10),
      organizationId: session.organizationId,
    };

    return apiSuccess(newEntry, 201);
  } catch (error) {
    return apiError(error, 'Failed to save validated learning to organizational memory.');
  }
}

