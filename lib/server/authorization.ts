import 'server-only';
import { UserSession } from './auth';
import { mockProjects } from '@/data/mockProjects';
import { Project } from '@/types';

export class AuthorizationError extends Error {
  constructor(message: string = 'Forbidden: Cross-tenant access is strictly prohibited.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Enforces Multi-Tenant Isolation (Anti-IDOR Defense).
 * Verifies whether the authenticated tenant is authorized to access the requested project.
 */
export function authorizeProjectAccess(session: UserSession, projectId: string): Project {
  // Look up project in data store
  const project = mockProjects.find(p => p.id === projectId);

  if (!project) {
    throw new Error('NOT_FOUND');
  }

  // Cross-tenant verification: Ensure project belongs to tenant or is authorized
  const isAuthorized = session.allowedProjectIds.includes(projectId) || project.privacyLevel === 'PUBLIC';

  if (!isAuthorized) {
    // Log security violation strictly server-side (never send details to browser)
    console.warn(`[SECURITY AUDIT] Unauthorized cross-tenant attempt by ${session.userId} (${session.organizationId}) on project ${projectId}`);
    throw new AuthorizationError('Access denied: You do not have permission to view this project.');
  }

  return project;
}
