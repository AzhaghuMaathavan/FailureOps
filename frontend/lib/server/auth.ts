import 'server-only';
import { NextRequest } from 'next/server';
import { serverConfig } from './config';
import { userStore } from './user-store';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: 'ORGANIZATION_ADMIN' | 'INTELLIGENCE_ANALYST' | 'VIEWER';
  allowedProjectIds: string[];
  createdAt: number;
}

export function getServerSession(req?: NextRequest): UserSession | null {
  if (!req) return null;

  // Check for session cookie or header
  const cookieVal = req.cookies.get(serverConfig.sessionCookieName)?.value || req.cookies.get('failureops_session')?.value || req.cookies.get('__Host-failureops-session')?.value;
  const headerEmail = req.headers.get('x-user-email');

  let user = null;
  if (cookieVal) {
    try {
      // Format: email:timestamp:hash or raw email
      const parts = cookieVal.split(':');
      const email = parts[0];
      user = userStore.getUserByEmail(email);
    } catch {}
  } else if (headerEmail) {
    user = userStore.getUserByEmail(headerEmail);
  }

  // If user found from session
  if (user) {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      role: user.role,
      allowedProjectIds: ['*', 'aurora', 'pulseflow', 'zenith'],
      createdAt: user.createdAt,
    };
  }

  return null;
}

export function requireAuth(req: NextRequest): UserSession {
  const session = getServerSession(req);
  if (!session || !session.userId) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
