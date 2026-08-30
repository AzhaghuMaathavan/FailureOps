export * from './contracts';
export * from './agents';

export type PrivacyLevel = 'PRIVATE' | 'ORGANIZATION' | 'ANONYMOUS_LEARNING' | 'PUBLIC' | 'PUBLIC_CASE_STUDY' | 'GLOBAL_SANITIZED';


export type RiskLevel = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'AT_RISK';

export type EvidenceSourceType =
  | 'PRODUCT_PLAN'
  | 'CUSTOMER_FEEDBACK'
  | 'PRODUCT_METRICS'
  | 'ENGINEERING_METRICS'
  | 'TEAM_OPERATIONS'
  | 'INCIDENT_REPORTS';

export interface Project {
  id: string;
  name: string;
  codeName: string;
  company: string;
  description: string;
  industry: string;
  stage: string;
  targetUsers: string;
  expectedLaunchDate: string;
  health: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  failureRisk: number; // 0 - 100
  riskTrend: string; // e.g. "+24% over 4 weeks"
  predictedNextFailure: string;
  predictionConfidence: number;
  historicalSimilarity: number;
  privacyLevel: PrivacyLevel;
  sourcesUploaded: EvidenceSourceType[];
  lastAnalyzedAt: string | null;
  activeFailureSeedsCount: number;
}

export interface EvidenceItem {
  id: string;
  projectId: string;
  sourceType: EvidenceSourceType;
  sourceFile: string;
  content: string;
  statement?: string;
  factType?: 'METRIC' | 'EVENT' | 'CLAIM' | 'STATUS' | 'POLICY' | 'INCIDENT';
  metricName?: string;
  baselineValue?: number | null;
  previousValue?: number | null;
  currentValue?: number | null;
  unit?: string | null;
  direction?: 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN';
  baselineTimestamp?: string | null;
  previousTimestamp?: string | null;
  currentTimestamp?: string | null;
  baselineToCurrentChangePercent?: number | null;
  previousToCurrentChangePercent?: number | null;
  reference: string;
  confidence: number;
  timestamp: string;
  category: string;
  snippetContext?: string;
  sourceDocumentId?: string;
  sourceChunkId?: string;
  supportingChunkIds?: string[];
  pageNumbers?: number[];
  rowNumbers?: number[];
  citation?: string;
  visibility?: string;
  supportingEvidence?: Array<{
    metric?: string;
    baseline?: string | number;
    current?: string | number;
    change?: string | number;
    trend?: string;
    source?: string;
  }>;
}

export interface Signal {
  id: string;
  projectId: string;
  name: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'HEALTHY';
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'FLUCTUATING';
  confidence: number;
  metricChange: string;
  supportingEvidenceIds: string[];
  supportingRelationshipIds?: string[];
  historicalPrevalence: number;
  description: string;
  signalStrength?: number;
  status?: string;
  signalType?: string;
  riskScore?: number | null;
  previousRiskScore?: number | null;
  baselineRiskScore?: number | null;
  riskChangePercent?: number | null;
  riskTrend?: string | null;
  scoringMethod?: string | null;
  polarity?: string | null;
  benchmarkTarget?: number | null;
  benchmarkCritical?: number | null;
  unit?: string | null;
  baselineValue?: number | null;
  previousValue?: number | null;
  currentValue?: number | null;
  baselineTimestamp?: string | null;
  previousTimestamp?: string | null;
  currentTimestamp?: string | null;
  baselineToCurrentChangePercent?: number | null;
  previousToCurrentChangePercent?: number | null;
  metricChangePercent?: number | null;
  metricTrend?: string | null;
  explanation?: string | null;
}


export interface FailureDNADimension {
  dimension: 'Technical' | 'Operational' | 'Adoption' | 'Execution' | 'Financial' | 'Customer';
  score: number; // 0 - 100
  severity: RiskLevel;
  primaryDrivers: string[];
  evidenceConfidence: number;
  historicalCorrelation: string;
  whyExplanation: string;
}

export interface FailureDNA {
  projectId: string;
  overallRisk: number;
  dimensions: FailureDNADimension[];
  dominantArchetype: string;
  generatedAt: string;
}

export interface HistoricalCase {
  id: string;
  name: string;
  companyAlias: string;
  industry: string;
  productDescription: string;
  similarity: number;
  outcome: string;
  outcomeType: 'FAILED' | 'RECOVERED' | 'DELAYED';
  primaryFailurePattern: string;
  historicalIntervention: string;
  interventionOutcome: string;
  privacyLevel: PrivacyLevel;
  timeline: { step: string; description: string; date: string }[];
  keyLessons: string[];
}

export interface CausalNode {
  id: string;
  label: string;
  category: 'operational' | 'engineering' | 'product' | 'outcome';
  severity: RiskLevel;
  evidenceSnippet: string;
  confidence: number;
  relatedSignals: string[];
  childIds: string[];
}

export interface Intervention {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  actionItems: string[];
  historicalEvidenceStrength: number;
  expectedImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  similarCasesSucceeded: string;
  backedByCases: string[];
}

export interface Experiment {
  id: string;
  projectId: string;
  interventionId: string;
  hypothesis: string;
  controlGroup: string;
  treatmentGroup: string;
  duration: string;
  successMetric: string;
  status: 'PLANNED' | 'RUNNING' | 'COMPLETED';
  baselineMetric: number;
  currentMetric?: number;
  treatmentMetric?: number;
  improvementDelta?: number;
  evidenceStrength: number;
  observedOutcome?: string;
  aiInterpretation?: string;
}

export interface OrganizationalMemoryEntry {
  id: string;
  pattern: string;
  evidenceSummary: string[];
  intervention: string;
  experimentDesign: string;
  outcome: string;
  confidence: number;
  context: {
    industry: string;
    stage: string;
    targetMarket: string;
  };
  tags: string[];
  verifiedAt: string;
}

export interface AssumptionInvestigation {
  id: string;
  projectId: string;
  assumptionText: string;
  status: 'CHALLENGED' | 'SUPPORTED' | 'INCONCLUSIVE';
  confidence: number;
  teamBelief: string;
  evidenceMetrics: {
    label: string;
    value: string;
    percentage: number;
    isContradiction?: boolean;
  }[];
  findingSummary: string;
  alternativeExplanation: string;
  evidenceSources: string[];
}

export interface UploadProgress {
  file: string;
  category: EvidenceSourceType;
  stage: 'RECEIVED' | 'PARSED' | 'NORMALIZED' | 'CHUNKED' | 'EMBEDDED' | 'INDEXED' | 'COMPLETED';
  progress: number;
}

export interface AnalysisStage {
  id: string;
  name: string;
  description: string;
  status: 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  logMessages: string[];
}
