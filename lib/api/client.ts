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
    throw new ApiError(
      body.message || body.error || 'A server-side communication error occurred.',
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

  // Evidence
  async getEvidence(projectId: string = 'aurora'): Promise<EvidenceItem[]> {
    return request<EvidenceItem[]>(`/api/evidence?projectId=${encodeURIComponent(projectId)}`);
  },

  // Signals
  async getSignals(projectId: string = 'aurora'): Promise<Signal[]> {
    return request<Signal[]>(`/api/signals?projectId=${encodeURIComponent(projectId)}`);
  },

  async uploadEvidenceMetadata(input: EvidenceUploadInput) {

    return request('/api/evidence/upload', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // Analysis
  async startAnalysis(projectId: string) {
    return request<{ jobId: string; status: string }>('/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },

  async getAnalysisStatus(jobId: string) {
    return request<{ jobId: string; status: string; stages: any[] }>(
      `/api/analysis/status?jobId=${encodeURIComponent(jobId)}`
    );
  },

  // Truth Engine
  async investigateAssumption(projectId: string, assumptionText: string): Promise<AssumptionInvestigation> {
    return request<AssumptionInvestigation>('/api/truth-engine/investigate', {
      method: 'POST',
      body: JSON.stringify({ projectId, assumptionText }),
    });
  },

  // Failure DNA
  async getFailureDNA(projectId: string = 'aurora'): Promise<FailureDNA> {
    return request<FailureDNA>(`/api/dna?projectId=${encodeURIComponent(projectId)}`);
  },

  // Failure Radar
  async getRadarTelemetry(projectId: string = 'aurora') {
    return request<any>(`/api/radar?projectId=${encodeURIComponent(projectId)}`);
  },

  // Global Search
  async search(query: string, filter: string = 'ALL') {
    return request<{ query: string; filter: string; historicalMatches: any[]; organizationalMemoryMatches: any[] }>(
      `/api/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`
    );
  },

  // Organizational Memory & Historical Cases
  async getOrganizationalMemory(): Promise<OrganizationalMemoryEntry[]> {
    return request<OrganizationalMemoryEntry[]>('/api/memory');
  },

  async getHistoricalCases(projectId: string = 'aurora') {
    return request<any>(`/api/memory?projectId=${encodeURIComponent(projectId)}`);
  },

  async saveOrganizationalMemory(entry: any): Promise<OrganizationalMemoryEntry> {
    return request<OrganizationalMemoryEntry>('/api/memory', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  // Predictions & Failure Chain
  async getFailureChain(projectId: string = 'aurora') {
    return request<any>(`/api/radar?projectId=${encodeURIComponent(projectId)}`);
  },

  async getPredictions(projectId: string = 'aurora') {
    return request<any>(`/api/radar?projectId=${encodeURIComponent(projectId)}`);
  },

  // What-if Simulations & Experiments
  async getExperiments(projectId: string = 'aurora'): Promise<any> {
    return request<any>(`/api/experiments?projectId=${encodeURIComponent(projectId)}`);
  },

  async runSimulation(projectId: string = 'aurora', scenarioId: string = 'simplify_onboarding') {
    return request<any>('/api/experiments', {
      method: 'POST',
      body: JSON.stringify({ projectId, scenarioId }),
    });
  },

  // Member 4: Interventions, Experiments, Outcomes & Radar
  async getInterventions(projectId: string = 'aurora') {
    return request<any>(`/api/interventions?projectId=${encodeURIComponent(projectId)}`);
  },

  async startExperiment(projectId: string = 'aurora', experimentId: string = 'exp_01') {
    return request<any>(`/api/experiments?action=start&projectId=${encodeURIComponent(projectId)}&experimentId=${encodeURIComponent(experimentId)}`, {
      method: 'POST',
    });
  },

  async verifyExperiment(projectId: string = 'aurora', experimentId: string = 'exp_01', metrics?: any) {
    return request<any>(`/api/experiments?action=verify&projectId=${encodeURIComponent(projectId)}&experimentId=${encodeURIComponent(experimentId)}`, {
      method: 'POST',
      body: JSON.stringify({ metrics }),
    });
  },

  async getOutcomes(projectId: string = 'aurora') {
    return request<any>(`/api/outcomes?projectId=${encodeURIComponent(projectId)}`);
  },

  async getExecutiveRadarSnapshot(projectId: string = 'aurora') {
    return request<any>(`/api/radar?view=executive&projectId=${encodeURIComponent(projectId)}`);
  },
};


