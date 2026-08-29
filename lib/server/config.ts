import 'server-only';

/**
 * Server-only configuration manager.
 * The Next.js BFF talks to the FastAPI backend over HTTP.
 * It must never open a PostgreSQL connection.
 */
interface ServerConfig {
  backendInternalUrl: string;
  ragInternalUrl: string;
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
  backendInternalUrl: process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000',
  ragInternalUrl: process.env.RAG_INTERNAL_URL || process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000',
  llmApiKey: process.env.LLM_API_KEY || '',
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

if (serverConfig.isProduction && serverConfig.authSecret.includes('dev_secret_key')) {
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn('[SECURITY NOTICE] Running with development placeholder AUTH_SECRET in production mode.');
  }
}
