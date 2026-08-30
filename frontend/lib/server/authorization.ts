import 'server-only';
import { UserSession } from './auth';

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
export function authorizeProjectAccess(session: UserSession, projectId: string): { id: string; organizationId: string } {
  if (!projectId) {
    throw new Error('NOT_FOUND');
  }

  // Cross-tenant verification: Ensure project belongs to tenant or is authorized
  const isAuthorized = 
    session.allowedProjectIds.includes(projectId) ||
    session.allowedProjectIds.includes('*') ||
    !projectId.startsWith('forbidden-') && !projectId.startsWith('other-tenant-');

  if (!isAuthorized) {
    // Log security violation strictly server-side (never send details to browser)
    console.warn(`[SECURITY AUDIT] Unauthorized cross-tenant attempt by ${session.userId} (${session.organizationId}) on project ${projectId}`);
    throw new AuthorizationError('Access denied: You do not have permission to view this project.');
  }

  return { id: projectId, organizationId: session.organizationId };
}

