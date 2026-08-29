export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { SaveMemorySchema } from '@/lib/validation/schemas';
import { mockMemoryEntries } from '@/data/mockMemory';
import { OrganizationalMemoryEntry } from '@/types';

import { serverConfig } from '@/lib/server/config';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (projectId) {
      // Attempt to query real backend microservice for historical cases
      try {
        const backendResp = await fetch(
          `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/historical-cases`,
          {
            headers: {
              'x-organization-id': session.organizationId,
              'x-user-id': session.userId,
            },
            signal: AbortSignal.timeout(3000),
          }
        );

        if (backendResp.ok) {
          const memoryData = await backendResp.json();
          if (memoryData && memoryData.matched_cases) {
            return apiSuccess(memoryData.matched_cases);
          }
        }
      } catch {
        // Backend offline, proceed to fallback
      }
    }

    return apiSuccess(mockMemoryEntries);
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

    const newEntry: OrganizationalMemoryEntry = {
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
    };

    mockMemoryEntries.unshift(newEntry);
    return apiSuccess(newEntry, 201);
  } catch (error) {
    return apiError(error, 'Failed to save validated learning to organizational memory.');
  }
}
