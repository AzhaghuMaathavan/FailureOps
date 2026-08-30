export const LANGGRAPH_PHASES = [
  'upload',
  'parser',
  'chunker',
  'embedding',
  'vector',
  'semantic_search',
  'evidence_agent',
  'signal_agent',
] as const;

export type LangGraphPhase = (typeof LANGGRAPH_PHASES)[number];

export type PhaseStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface PhaseRecord {
  key: LangGraphPhase;
  label: string;
  status: PhaseStatus;
  detail: string;
  latencyMs: number | null;
  startedAt: string | null;
  endedAt: string | null;
  count?: number;
}

export interface DocumentChunkSnapshot {
  id: string;
  filename: string;
  title?: string;
  documentType?: string;
  status: string;
  pageCount: number;
  chunkCount: number;
  embeddedCount: number;
  storageProvider?: string;
}

export interface UploadMetadata {
  filename: string;
  title: string;
  documentType: string;
  description: string;
  visibility: 'PRIVATE' | 'ORGANIZATION';
  department: string;
}

export interface StagedUploadFile extends UploadMetadata {
  mimeType: string;
  bytes: Uint8Array;
}

export const PHASE_LABELS: Record<LangGraphPhase, string> = {
  upload: 'Document upload',
  parser: 'Parser',
  chunker: 'Chunker',
  embedding: 'Embedding',
  vector: 'Vector storage',
  semantic_search: 'Semantic search',
  evidence_agent: 'Agent 1 · Evidence',
  signal_agent: 'Agent 2 · Signal',
};

export function emptyPhases(): PhaseRecord[] {
  return LANGGRAPH_PHASES.map((key) => ({
    key,
    label: PHASE_LABELS[key],
    status: 'PENDING',
    detail: 'Waiting',
    latencyMs: null,
    startedAt: null,
    endedAt: null,
  }));
}

export interface LangGraphRunSnapshot {
  runId: string;
  projectId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentPhase: LangGraphPhase | null;
  phases: PhaseRecord[];
  documents: DocumentChunkSnapshot[];
  documentIds: string[];
  analysisId: string | null;
  evidenceCount: number;
  signalCount: number;
  error: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  totalLatencyMs: number | null;
}
