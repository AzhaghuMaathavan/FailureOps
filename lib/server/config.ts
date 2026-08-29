import 'server-only';

/**
 * Server-only configuration manager.
 * Guarantees that private infrastructure URLs, database credentials,
 * and AI API keys are never bundled into client-side JavaScript.
 */
interface ServerConfig {
  backendInternalUrl: string;
  ragInternalUrl: string;
  databaseUrl: string;
  llmApiKey: string;
  authSecret: string;
  sessionCookieName: string;
  isProduction: boolean;
  rateLimits: {
    general: number;
    search: number;
    analysis: number;
    upload: number;
  };
}

export const serverConfig: ServerConfig = {
  backendInternalUrl: process.env.BACKEND_INTERNAL_URL || 'http://internal-backend.failureops.local:8080',
  ragInternalUrl: process.env.RAG_INTERNAL_URL || 'http://internal-rag-service.failureops.local:8000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://app_user:placeholder@internal-db.failureops.local:5432/failureops',
  llmApiKey: process.env.LLM_API_KEY || 'sk_dev_mock_key_server_only',
  authSecret: process.env.AUTH_SECRET || 'dev_secret_key_change_in_production_32char',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || '__Host-failureops-session',
  isProduction: process.env.NODE_ENV === 'production',
  rateLimits: {
    general: parseInt(process.env.RATE_LIMIT_GENERAL || '120', 10),
    search: parseInt(process.env.RATE_LIMIT_SEARCH || '45', 10),
    analysis: parseInt(process.env.RATE_LIMIT_ANALYSIS || '10', 10),
    upload: parseInt(process.env.RATE_LIMIT_UPLOAD || '15', 10),
  },
};

// Log security posture at server startup
if (serverConfig.isProduction && serverConfig.authSecret.includes('dev_secret_key')) {
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn('[SECURITY NOTICE] Running with development placeholder AUTH_SECRET in production mode.');
  }
}
