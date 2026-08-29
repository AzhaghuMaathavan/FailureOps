export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ProjectRegistrationSchema } from '@/lib/validation/schemas';
import { mockProjects } from '@/data/mockProjects';
import { Project } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    // Multi-tenant filter: Only return projects this organization is authorized to access
    const userProjects = mockProjects.filter(
      p => session.allowedProjectIds.includes(p.id) || p.privacyLevel === 'PUBLIC'
    );

    // Data minimization: Return sanitized project summaries
    const sanitized = userProjects.map(p => ({
      id: p.id,
      name: p.name,
      codeName: p.codeName,
      company: p.company,
      description: p.description,
      industry: p.industry,
      stage: p.stage,
      health: p.health,
      failureRisk: p.failureRisk,
      riskTrend: p.riskTrend,
      predictedNextFailure: p.predictedNextFailure,
      privacyLevel: p.privacyLevel,
    }));

    return apiSuccess(sanitized);
  } catch (error) {
    return apiError(error, 'Unable to retrieve authorized project portfolio.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'upload');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = ProjectRegistrationSchema.parse(body);

    const newProject: Project = {
      id: validated.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: validated.name,
      codeName: `PROJECT ${validated.name.toUpperCase().slice(0, 6)}`,
      company: validated.company,
      description: validated.description,
      industry: validated.industry,
      stage: validated.stage,
      targetUsers: validated.targetUsers,
      expectedLaunchDate: validated.expectedLaunchDate,
      health: 'AT_RISK',
      failureRisk: 82,
      riskTrend: '+24% over 4 weeks',
      predictedNextFailure: 'Missed Beta Release',
      predictionConfidence: 86,
      historicalSimilarity: 89,
      privacyLevel: validated.privacyLevel,
      sourcesUploaded: validated.sourcesUploaded,
      lastAnalyzedAt: 'Just now',
      activeFailureSeedsCount: 4,
    };

    mockProjects.push(newProject);
    return apiSuccess(newProject, 201);
  } catch (error) {
    return apiError(error, 'Failed to register project in enclave.');
  }
}
