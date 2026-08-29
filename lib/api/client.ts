import {
  Project,
  EvidenceItem,
  Signal,
  FailureDNA,
  AssumptionInvestigation,
  OrganizationalMemoryEntry,
  Experiment,
} from '@/types';

import { ProjectRegistrationInput, EvidenceUploadInput } from '@/lib/validation/schemas';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: { field: string; message: string }[];
  requestId?: string;
}

class ApiError extends Error {
  public status: number;
  public requestId?: string;
  public details?: { field: string; message: string }[];
  public code?: string;

  constructor(
    message: string,
    status: number,
    requestId?: string,
    details?: { field: string; message: string }[],
    code?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.details = details;
    this.code = code;
  }
}

export { ApiError };

export function isRagUnavailable(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 503 || err.code === 'RAG Unavailable' || /RAG unavailable/i.test(err.message);
  }
  return err instanceof Error && /RAG unavailable/i.test(err.message);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const body: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    message: 'Unable to parse server response.',
  }));

  if (!response.ok || !body.success) {
    if (response.status === 429) {
      throw new ApiError(
        body.message || 'Rate limit exceeded. Please wait a moment before trying again.',
        429,
        body.requestId
      );
    }
    const detailedMessage = body.details && body.details.length > 0
      ? body.details.map(d => `${d.field ? `${d.field}: ` : ''}${d.message}`).join(', ')
      : (body.message || body.error || 'A server-side communication error occurred.');

    throw new ApiError(
      detailedMessage,
      response.status,
      body.requestId,
      body.details,
      body.error
    );
  }

  return body.data as T;
}

export const apiClient = {
  // Projects
  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/api/projects');
  },

  async getProject(id: string): Promise<Project> {
    return request<Project>(`/api/projects/${id}`);
  },

  async registerProject(input: ProjectRegistrationInput): Promise<Project> {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // Evidence & Document Upload
  async getEvidence(projectId: string = 'aurora', analysisId?: string): Promise<any> {
    const q = analysisId ? `&analysisId=${encodeURIComponent(analysisId)}` : '';
    return request<any>(`/api/evidence?projectId=${encodeURIComponent(projectId)}${q}`);
  },

  async uploadProjectFile(projectId: string, file: File, title?: string, documentType: string = 'PROJECT_DOC', description?: string) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('projectId', projectId);
    if (title) formData.append('title', title);
    formData.append('documentType', documentType);
    if (description) formData.append('description', description);

    const response = await fetch('/api/evidence/upload', {
      method: 'POST',
      body: formData,
    });

    const body = await response.json().catch(() => ({ success: false, message: 'Upload parse error' }));
    if (!response.ok || !body.success) {
      throw new ApiError(body.message || 'File upload failed', response.status);
    }
    return body.data;
  },

  async listDocuments(projectId: string = 'aurora'): Promise<any[]> {
    return request<any[]>(`/api/evidence/upload?projectId=${encodeURIComponent(projectId)}`);
  },

  async deleteDocument(projectId: string, documentId: string): Promise<any> {
    return request<any>(`/api/evidence/upload?projectId=${encodeURIComponent(projectId)}&documentId=${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
    });
  },

  async uploadEvidenceMetadata(input: EvidenceUploadInput) {
    return request('/api/evidence/upload', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },


  // Signals
  async getSignals(projectId: string = 'aurora', analysisId?: string): Promise<{
    analysisId: string | null;
    signals: Signal[];
  }> {
    const q = analysisId ? `&analysisId=${encodeURIComponent(analysisId)}` : '';
    const data = await request<{ analysisId: string | null; signals: Signal[] } | Signal[]>(
      `/api/signals?projectId=${encodeURIComponent(projectId)}${q}`
    );
    if (Array.isArray(data)) {
      return { analysisId: null, signals: data };
    }
    return {
      analysisId: data?.analysisId ?? null,
      signals: data?.signals || [],
    };
  },

  // Analysis
  async startAnalysis(projectId: string, reasoningDepth: string = 'DEEP') {
    return request<{ jobId: string; analysisId: string; status: string; message?: string }>('/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ projectId, reasoningDepth }),
    });
  },

  async getAnalysisStatus(jobId: string, projectId: string = 'aurora') {
    return request<{
      jobId: string;
      analysisId: string;
      projectId: string;
      status: string;
      currentStage?: string;
      progressPercent?: number;
      stages: any[];
      resultSummary?: any;
      errorMessage?: string;
    }>(`/api/analysis/status?jobId=${encodeURIComponent(jobId)}&projectId=${encodeURIComponent(projectId)}`);
  },

  async getBackendHealth() {
    return request<{
      status: string;
      service?: string;
      backend?: { reachable: boolean; status?: string };
    }>('/api/health');
  },

  async getDatabaseHealth() {
    return request<{
      status: string;
      database: string;
      pgvector?: boolean;
    }>('/api/health/db');
  },

  async listFoundationDocuments(projectId: string = 'aurora') {
    return request<any[]>(`/api/documents?projectId=${encodeURIComponent(projectId)}`);
  },

  async uploadFoundationDocument(projectId: string, file: File, sync: boolean = false) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('projectId', projectId);
    formData.append('project_id', projectId);
    formData.append('sync', sync ? 'true' : 'false');
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    const body = await response.json().catch(() => ({ success: false, message: 'Upload parse error' }));
    if (!response.ok || !body.success) {
      throw new ApiError(body.message || 'File upload failed', response.status);
    }
    return body.data;
  },

  async queryRag(projectId: string, query: string) {
    return request<{
      answer: string;
      sources: { document?: string; page?: number | null; chunk_id?: string }[];
      evidenceState?: string;
      domainState?: string;
      projectId: string;
    }>('/api/rag/query', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, query }),
    });
  },

  async getRagHealth() {
    return request<{
      reachable: boolean;
      service?: string;
      ragStatus?: string;
      database?: string;
      vectorStore?: boolean;
      rustfsReachable?: boolean;
      rustfsProvider?: string;
      rustfsBucket?: string;
      embeddingProviderConfigured?: boolean;
      llmProviderConfigured?: boolean;
      parseProviderConfigured?: boolean;
      error?: string;
    }>('/api/rag/health');
  },

  async getRagPipeline(projectId: string = 'aurora') {
    return request<{
      projectId: string;
      health: {
        reachable: boolean;
        ragStatus?: string;
        database?: string;
        vectorStore?: boolean;
        rustfsReachable?: boolean;
        rustfsProvider?: string;
        rustfsBucket?: string;
      };
      documents: any[];
      totals: {
        documents: number;
        bytes?: number;
        pages?: number;
        chunks: number;
        embedded: number;
        vectors?: number;
        retrieved?: number;
        evidence: number;
        signals: number;
        chunksSearched: number;
      };
      evidenceAnalysisId: string | null;
      signalAnalysisId: string | null;
      metrics: any;
      storageHealth?: any;
      analysisStatus?: string | null;
      stages: {
        key: string;
        label: string;
        status: string;
        detail: string;
        count?: number;
        error?: string | null;
        input_count?: number;
        output_count?: number;
        started_at?: string | null;
        completed_at?: string | null;
      }[];
    }>(`/api/rag/pipeline?projectId=${encodeURIComponent(projectId)}`);
  },

  // Truth Engine
  async investigateAssumption(projectId: string, assumptionText: string): Promise<AssumptionInvestigation> {
    return request<AssumptionInvestigation>('/api/truth-engine/investigate', {
      method: 'POST',
      body: JSON.stringify({ projectId, assumptionText }),
    });
  },

  // Failure DNA
  async getFailureDNA(projectId: string = 'aurora'): Promise<any> {
    return request<any>(`/api/dna?projectId=${encodeURIComponent(projectId)}`);
  },

  // Failure Radar & Causal Chain & Predictions
  async getRadarTelemetry(projectId: string = 'aurora') {
    return request<any>(`/api/radar?view=executive&projectId=${encodeURIComponent(projectId)}`);
  },

  async getFailureChain(projectId: string = 'aurora') {
    return request<any>(`/api/radar?view=chain&projectId=${encodeURIComponent(projectId)}`);
  },

  async getPredictions(projectId: string = 'aurora') {
    return request<any>(`/api/radar?view=predictions&projectId=${encodeURIComponent(projectId)}`);
  },

  // Global Search
  async search(query: string, filter: string = 'ALL', projectId?: string) {
    const projectQ = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    return request<{
      query: string;
      filter: string;
      projectId?: string;
      historicalMatches: any[];
      organizationalMemoryMatches: any[];
      evidenceHits: any[];
      projectMatches: any[];
    }>(`/api/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}${projectQ}`);
  },

  async retrieveKnowledge(query: string, projectId?: string) {
    return request<{ query: string; projectId: string | null; hits: any[]; metrics: any }>(
      '/api/retrieval',
      {
        method: 'POST',
        body: JSON.stringify({ query, projectId }),
      }
    );
  },

  async askProject(projectId: string, query: string, conversationId?: string) {
    return request<{
      projectId: string;
      answer: string;
      citations: { documentId?: string; filename?: string; lineage?: any }[];
      hits: any[];
      conversationId?: string;
      domainState?: string;
      evidenceState?: string;
    }>('/api/ask', {
      method: 'POST',
      body: JSON.stringify({ projectId, query, conversationId }),
    });
  },

  // Organizational Memory & Historical Cases
  async getOrganizationalMemory(projectId: string = 'aurora', pattern?: string): Promise<any> {
    const q = pattern ? `&pattern=${encodeURIComponent(pattern)}` : '';
    return request<any>(`/api/memory?projectId=${encodeURIComponent(projectId)}${q}`);
  },

  async getHistoricalCases(projectId: string = 'aurora') {
    return request<any>(`/api/memory?view=historical&projectId=${encodeURIComponent(projectId)}`);
  },

  async saveOrganizationalMemory(entry: any): Promise<OrganizationalMemoryEntry> {
    return request<OrganizationalMemoryEntry>('/api/memory', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  // Member 4: Interventions, Experiments, Outcomes & Radar
  async getInterventions(projectId: string = 'aurora') {
    return request<any>(`/api/interventions?projectId=${encodeURIComponent(projectId)}`);
  },

  async getExperiments(projectId: string = 'aurora'): Promise<any> {
    return request<any>(`/api/experiments?projectId=${encodeURIComponent(projectId)}`);
  },

  async startExperiment(projectId: string = 'aurora', experimentId: string = 'exp_01') {
    return request<any>('/api/experiments', {
      method: 'POST',
      body: JSON.stringify({ projectId, experimentId, action: 'start' }),
    });
  },

  async verifyExperiment(projectId: string = 'aurora', experimentId: string = 'exp_01', measuredMetrics?: any) {
    return request<any>('/api/experiments', {
      method: 'POST',
      body: JSON.stringify({ projectId, experimentId, action: 'verify', measuredMetrics }),
    });
  },

  async getSimulation(projectId: string = 'aurora') {
    return request<any>(`/api/simulation?projectId=${encodeURIComponent(projectId)}`);
  },

  async runSimulation(projectId: string = 'aurora', scenarioId?: string) {
    return request<any>('/api/simulation', {
      method: 'POST',
      body: JSON.stringify({ projectId, scenarioId }),
    });
  },

  async getOutcomes(projectId: string = 'aurora') {
    return request<any>(`/api/outcomes?projectId=${encodeURIComponent(projectId)}`);
  },

  async getExecutiveRadarSnapshot(projectId: string = 'aurora') {
    return request<any>(`/api/radar?view=executive&projectId=${encodeURIComponent(projectId)}`);
  },

};


