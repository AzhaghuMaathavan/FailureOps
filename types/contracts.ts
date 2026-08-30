/**
 * FailureOps X — Common Data Contracts
 * Strict type contracts for cross-functional multi-agent intelligence pipeline.
 */

export type PrivacyLevel =
  | 'PRIVATE'
  | 'ORGANIZATION'
  | 'ANONYMOUS_LEARNING'
  | 'PUBLIC'
  | 'PUBLIC_CASE_STUDY'
  | 'GLOBAL_SANITIZED';

export type RiskLevel = 'HEALTHY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'WARNING' | 'AT_RISK';

export type EvidenceSourceType =
  | 'PRODUCT_PLAN'
  | 'CUSTOMER_FEEDBACK'
  | 'PRODUCT_METRICS'
  | 'ENGINEERING_METRICS'
  | 'TEAM_OPERATIONS'
  | 'INCIDENT_REPORTS';

export interface PrivacyMetadata {
  ownerCompany: string;
  visibility: PrivacyLevel;
  accessScope: string[];
  consentForSanitizedLearning: boolean;
  sanitizedAt?: string;
}

export interface EvidenceItem {
  id: string;
  projectId: string;
  sourceId: string;
  sourceType: EvidenceSourceType;
  documentName: string;
  pageOrSection?: string;
  evidenceType: 'METRIC' | 'FACT' | 'QUOTE' | 'ANOMALY' | 'LOG' | 'OBSERVATION';
  claim: string;
  value?: string | number;
  unit?: string;
  confidence: number; // 0.0 - 1.0
  timestamp?: string;
  visibility: PrivacyLevel;
  metadata?: Record<string, any>;
  snippetContext?: string;
  category?: string;
  reference?: string;
}

export interface Signal {
  id: string;
  projectId: string;
  name: string;
  category: 'TECHNICAL' | 'PRODUCT' | 'TEAM' | 'MARKET' | 'EXECUTION' | 'OPERATIONAL' | 'CUSTOMER';
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  severity: RiskLevel;
  trend?: 'INCREASING' | 'DECREASING' | 'STABLE' | 'FLUCTUATING';
  confidence: number; // 0.0 - 1.0
  supportingEvidenceIds: string[];
  detectedAt: string;
  metricChange?: string;
  description?: string;
  signalStrength?: number;
  status?: string;
  visibility: PrivacyLevel;
}

export interface Pattern {
  id: string;
  name: string;
  archetype: string;
  description: string;
  confidence: number;
  contributingSignalIds: string[];
  historicalFrequency: number;
  severity: RiskLevel;
}

export interface FailureDNADimension {
  dimension: 'Technical' | 'Operational' | 'Adoption' | 'Execution' | 'Financial' | 'Customer';
  score: number; // 0 - 100
  severity: RiskLevel;
  primaryDrivers: string[];
  evidenceConfidence: number; // 0.0 - 1.0
  historicalCorrelation: string;
  whyExplanation: string;
}

export interface FailureDNA {
  projectId: string;
  overallRisk: number; // 0 - 100
  dimensions: FailureDNADimension[];
  dominantArchetype: string;
  contributingSignals: string[];
  confidence: number; // 0.0 - 1.0
  generatedAt: string;
  visibility: PrivacyLevel;
}

export interface ClaimAssessment {
  id: string;
  assumption: string;
  status: 'VERIFIED' | 'CHALLENGED' | 'UNSUPPORTED' | 'REFUTED';
  confidence: number;
  contradictingEvidenceIds: string[];
  supportingEvidenceIds: string[];
  explanation: string;
  suggestedAction: string;
}

export interface HistoricalMatch {
  caseId: string;
  projectId?: string;
  name: string;
  companyAlias: string;
  industry: string;
  similarityScore: number; // 0.0 - 1.0
  matchingDimensions: string[];
  failureOutcome: string;
  outcomeType: 'FAILED' | 'RECOVERED' | 'DELAYED' | 'ABANDONED';
  historicalIntervention: string;
  interventionOutcome: string;
  sanitizedEvidenceReferences: string[];
  visibilityStatus: PrivacyLevel;
  timeline?: { step: string; description: string; date: string }[];
  keyLessons?: string[];
}

export interface Prediction {
  id: string;
  projectId: string;
  predictedFailure: string;
  probability: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  timeframe: string; // e.g. "2-4 Weeks", "1-2 Months"
  supportingSignals: string[];
  historicalMatches: string[];
  explanation: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  generatedAt: string;
}

export interface InterventionRecommendation {
  id: string;
  projectId: string;
  recommendation: string;
  actionType: 'PROCESS' | 'ARCHITECTURE' | 'ORGANIZATIONAL' | 'EXPERIMENT' | 'ROLLBACK';
  reason: string;
  supportingCases: string[];
  expectedEffect: string;
  confidence: number; // 0.0 - 1.0
  riskOfInaction: string;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
}

export interface OutcomeVerification {
  id: string;
  projectId: string;
  interventionId: string;
  baselineMetric: string;
  currentMetric: string;
  delta: string;
  outcomeStatus: 'RESOLVED' | 'IMPROVING' | 'NO_CHANGE' | 'DEGRADED';
  verifiedAt: string;
  learnedInsights: string[];
  eligibleForGlobalSanitization: boolean;
}
