/**
 * FailureOps X — Agent Interfaces & Input/Output Contracts
 * Defines standard structured inputs and outputs for autonomous intelligence agents.
 */

import {
  EvidenceItem,
  Signal,
  Pattern,
  FailureDNA,
  ClaimAssessment,
  HistoricalMatch,
  Prediction,
  InterventionRecommendation,
  PrivacyLevel
} from './contracts';

// ==========================================
// 1. Evidence Agent
// ==========================================
export interface RetrievedChunkCandidate {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  score: number;
  pageNumber?: number;
  sectionHeader?: string;
  metadata?: Record<string, any>;
}

export interface EvidenceAgentInput {
  projectId: string;
  documentId?: string;
  candidates: RetrievedChunkCandidate[];
  privacyScope: PrivacyLevel;
}

export interface EvidencePacket {
  projectId: string;
  items: EvidenceItem[];
  extractionTimestamp: string;
  totalChunksAnalyzed: number;
  qualityScore: number;
}

// ==========================================
// 2. Signal Agent
// ==========================================
export interface SignalAgentInput {
  projectId: string;
  evidencePacket: EvidencePacket;
  baselineMetrics?: Record<string, any>;
}

export interface SignalPacket {
  projectId: string;
  signals: Signal[];
  signalDensity: number;
  anomaliesDetected: number;
  timestamp: string;
}

// ==========================================
// 3. Pattern Agent
// ==========================================
export interface PatternAgentInput {
  projectId: string;
  signalPacket: SignalPacket;
}

export interface PatternPacket {
  projectId: string;
  patterns: Pattern[];
  dominantPatternId: string;
  compoundRiskScore: number;
  timestamp: string;
}

// ==========================================
// 4. Failure DNA Agent
// ==========================================
export interface FailureDNAAgentInput {
  projectId: string;
  patternPacket: PatternPacket;
  signalPacket: SignalPacket;
}

export interface FailureDNAPacket {
  projectId: string;
  failureDNA: FailureDNA;
  executiveSummary: string;
  confidenceScore: number;
}

// ==========================================
// 5. Truth / Assumption Agent
// ==========================================
export interface TruthAgentInput {
  projectId: string;
  assumptions: Array<{ id: string; assumption: string; category?: string }>;
  evidencePacket: EvidencePacket;
}

export interface TruthAssessmentPacket {
  projectId: string;
  assessments: ClaimAssessment[];
  overallAssumptionIntegrityScore: number;
  highRiskAssumptionsCount: number;
}

// ==========================================
// 6. Prediction Agent
// ==========================================
export interface PredictionAgentInput {
  projectId: string;
  failureDNA: FailureDNA;
  historicalMatches: HistoricalMatch[];
  signalPacket: SignalPacket;
}

export interface PredictionPacket {
  projectId: string;
  primaryPrediction: Prediction;
  secondaryPredictions: Prediction[];
  trajectoryRiskVelocity: number; // rate of failure compounding
}

// ==========================================
// 7. Intervention Agent
// ==========================================
export interface InterventionAgentInput {
  projectId: string;
  predictionPacket: PredictionPacket;
  failureDNA: FailureDNA;
  historicalMatches: HistoricalMatch[];
}

export interface InterventionPacket {
  projectId: string;
  recommendedInterventions: InterventionRecommendation[];
  topPriorityAction: InterventionRecommendation;
  estimatedRecoveryProbability: number;
}
