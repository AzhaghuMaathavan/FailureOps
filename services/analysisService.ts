import { AnalysisStage } from '@/types';

export const RAG_ANALYSIS_STAGES: AnalysisStage[] = [
  {
    id: 'PARSING_DOCUMENTS',
    name: 'Document parsing',
    description: 'Process and normalize uploaded project artifacts through the RAG parser.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'INDEXING',
    name: 'Chunking & embedding',
    description: 'Confirm semantic chunks and vector embeddings are indexed.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'RETRIEVING_EVIDENCE',
    name: 'Evidence retrieval',
    description: '16-dimension hybrid retrieval against the project vector store.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'EXTRACTING_EVIDENCE',
    name: 'Evidence Agent',
    description: 'Extract verified facts and citations from retrieved chunks.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'GROUPING_EVIDENCE',
    name: 'Evidence grouping',
    description: 'Validate the evidence packet and cluster related citations.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'CORRELATING_PATTERNS',
    name: 'Trend correlation',
    description: 'Detect numerical trends and cross-source relationships.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'SYNTHESIZING_SIGNALS',
    name: 'Signal Agent',
    description: 'Synthesize operational signals grounded in retrieved evidence.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'CALCULATING_FAILURE_DNA',
    name: 'Failure DNA',
    description: 'Compute multi-dimensional Failure DNA from grounded signals.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'BUILDING_FAILURE_CHAIN',
    name: 'Failure chain',
    description: 'Model causal trajectory and predicted next failure.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'RUNNING_SIMULATIONS',
    name: 'Historical memory & simulation',
    description: 'Match historical cases and run what-if simulations.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'SYNTHESIZING_DECISIONS',
    name: 'Interventions & radar',
    description: 'Formulate interventions, experiments, and the failure radar snapshot.',
    status: 'WAITING',
    logMessages: [],
  },
  {
    id: 'PERSISTING_ANALYSIS',
    name: 'Persist intelligence',
    description: 'Write evidence, signals, and downstream packets to the RAG database.',
    status: 'WAITING',
    logMessages: [],
  },
];

export const INITIAL_ANALYSIS_STAGES = RAG_ANALYSIS_STAGES;

export function mapRagAnalysisStages(
  backendStatus: string,
  isDone: boolean,
  isFailed: boolean
): AnalysisStage[] {
  const currentIdx = RAG_ANALYSIS_STAGES.findIndex((s) => s.id === backendStatus);

  return RAG_ANALYSIS_STAGES.map((s, idx) => {
    if (isDone) return { ...s, status: 'COMPLETED' as const };
    if (isFailed) {
      if (currentIdx === -1) return { ...s, status: idx === 0 ? 'FAILED' : 'WAITING' };
      if (idx < currentIdx) return { ...s, status: 'COMPLETED' as const };
      if (idx === currentIdx) return { ...s, status: 'FAILED' as const };
      return { ...s, status: 'WAITING' as const };
    }
    if (currentIdx === -1) {
      return { ...s, status: 'WAITING' as const };
    }
    if (idx < currentIdx) return { ...s, status: 'COMPLETED' as const };
    if (idx === currentIdx) return { ...s, status: 'RUNNING' as const };
    return { ...s, status: 'WAITING' as const };
  });
}
