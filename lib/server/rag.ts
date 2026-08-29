import 'server-only';
import { serverConfig } from './config';
import { UserSession } from './auth';

export class RagBackendError extends Error {
  status: number;
  body: string;
  path: string;

  constructor(status: number, body: string, path: string) {
    super(`RAG backend ${path} returned HTTP ${status}`);
    this.name = 'RagBackendError';
    this.status = status;
    this.body = body;
    this.path = path;
  }
}

export class RagUnreachableError extends Error {
  path: string;

  constructor(path: string, cause?: unknown) {
    super('RAG unavailable');
    this.name = 'RagUnreachableError';
    this.path = path;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

function ragUrl(path: string): string {
  const prefix = path.startsWith('/') ? path : `/${path}`;
  return `${serverConfig.ragInternalUrl}${prefix}`;
}

function isFormDataBody(body: BodyInit | null | undefined): boolean {
  if (!body || typeof body !== 'object') return false;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  return Object.prototype.toString.call(body) === '[object FormData]';
}

export function ragHeaders(session: UserSession, extra?: HeadersInit, body?: BodyInit | null): Headers {
  const headers = new Headers(extra);
  headers.set('x-organization-id', session.organizationId);
  headers.set('x-user-id', session.userId);
  if (isFormDataBody(body)) {
    // Let fetch set multipart boundary. A JSON Content-Type empties the file part.
    headers.delete('Content-Type');
    return headers;
  }
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

export async function ragFetch<T = unknown>(
  path: string,
  session: UserSession,
  init: RequestInit = {}
): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  console.info(`[FAILUREOPS] ${method} ${path}`);

  let resp: Response;
  try {
    resp = await fetch(ragUrl(path), {
      ...init,
      headers: ragHeaders(session, init.headers, init.body),
      cache: 'no-store',
      signal: init.signal ?? AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    console.error(`[FAILUREOPS] RAG unreachable at ${path}`);
    throw new RagUnreachableError(path, cause);
  }

  if (!resp.ok) {
    const err = await resp.text();
    console.error(`[RAG] ${method} ${path} HTTP ${resp.status}`);
    throw new RagBackendError(resp.status, err, path);
  }

  return resp.json() as Promise<T>;
}

export async function ragFetchSafe<T>(
  path: string,
  session: UserSession,
  init: RequestInit = {},
  fallback: T
): Promise<T> {
  try {
    return await ragFetch<T>(path, session, init);
  } catch (error) {
    if (error instanceof RagUnreachableError) {
      throw error;
    }
    return fallback;
  }
}

export function mapRagHit(hit: any): {
  id: string;
  documentId?: string;
  projectId?: string;
  filename: string;
  snippet: string;
  score: number;
  location: string | null;
} {
  const lineage = hit?.lineage || {};
  const pages = lineage.page_numbers || lineage.page_ids || [];
  return {
    id: hit.chunk_id || hit.id,
    documentId: hit.document_id,
    projectId: hit.project_id,
    filename: lineage.document_name || hit.filename || 'Project Document',
    snippet: hit.content || hit.snippet || '',
    score: Number(hit.rerank_score ?? hit.hybrid_score ?? hit.bm25_score ?? 0),
    location: Array.isArray(pages) && pages.length > 0 ? `Page ${pages.join(', ')}` : lineage.location || null,
  };
}

export function mapHistoricalCase(raw: any) {
  const privacy =
    raw.visibility === 'GLOBAL_ANONYMIZED' || raw.privacyLevel === 'SHARED_ANONYMIZED'
      ? 'ANONYMOUS_LEARNING'
      : raw.privacyLevel || raw.visibility || 'PRIVATE';

  return {
    id: raw.id,
    name: raw.name,
    companyAlias: raw.company_alias || raw.companyAlias || raw.company || raw.name,
    industry: raw.industry || 'Enterprise',
    productDescription: raw.productDescription || raw.pattern || raw.failure || '',
    primaryFailurePattern: raw.primaryFailurePattern || raw.failure || raw.pattern || '',
    historicalIntervention: raw.historicalIntervention || raw.intervention || '',
    interventionOutcome: raw.interventionOutcome || raw.outcome || raw.intervention || '',
    outcome: raw.outcome || raw.interventionOutcome || '',
    outcomeType: raw.outcome_type || raw.outcomeType || 'RECOVERED',
    similarity: raw.similarity ?? 0,
    privacyLevel: privacy,
    pattern: raw.pattern,
    intervention: raw.intervention,
    keyLessons: raw.key_lessons || raw.keyLessons || [],
    timeline: raw.timeline || [],
  };
}

export function mapMemoryEntry(raw: any) {
  const confidenceRaw = raw.confidence;
  const confidence =
    typeof confidenceRaw === 'number'
      ? confidenceRaw <= 1
        ? Math.round(confidenceRaw * 100)
        : confidenceRaw
      : 0;

  return {
    id: raw.memory_id || raw.id,
    pattern: raw.pattern_name || raw.pattern || 'Unnamed memory',
    evidenceSummary: raw.key_lessons || raw.evidenceSummary || raw.evidence_ids || [],
    intervention: raw.intervention_title || raw.intervention || '',
    experimentDesign: raw.source_experiment_id || raw.experimentDesign || '',
    outcome: raw.observed_impact || raw.outcome || '',
    confidence,
    context: raw.context || {
      industry: 'Unspecified',
      stage: 'Unspecified',
      targetMarket: raw.visibility || 'Organization',
    },
    tags: Array.isArray(raw.tags)
      ? raw.tags
      : [raw.pattern_name, raw.memory_type, raw.outcome_status].filter(Boolean),
    verifiedAt: String(raw.created_at || raw.verifiedAt || '').slice(0, 10),
  };
}
