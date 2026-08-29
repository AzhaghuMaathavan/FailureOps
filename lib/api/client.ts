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

  constructor(message: string, status: number, requestId?: string, details?: { field: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
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
      body.details
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
  async getSignals(projectId: string = 'aurora', analysisId?: string): Promise<Signal[]> {
    const q = analysisId ? `&analysisId=${encodeURIComponent(analysisId)}` : '';
    return request<Signal[]>(`/api/signals?projectId=${encodeURIComponent(projectId)}${q}`);
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
    }>(`/api/analysis/status?jobId=${encodeURIComponent(jobId)}&projectId=${encodeURIComponent(projectId)}`);
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
  async search(query: string, filter: string = 'ALL') {
    return request<{ query: string; filter: string; historicalMatches: any[]; organizationalMemoryMatches: any[] }>(
      `/api/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`
    );
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

  async runSimulation(projectId: string = 'aurora', scenarioId: string = 'simplify_onboarding') {
    return request<any>('/api/experiments', {
      method: 'POST',
      body: JSON.stringify({ projectId, scenarioId, action: 'simulate' }),
    });
  },

  async getOutcomes(projectId: string = 'aurora') {
    return request<any>(`/api/outcomes?projectId=${encodeURIComponent(projectId)}`);
  },

  async getExecutiveRadarSnapshot(projectId: string = 'aurora') {
    return request<any>(`/api/radar?view=executive&projectId=${encodeURIComponent(projectId)}`);
  },

};


