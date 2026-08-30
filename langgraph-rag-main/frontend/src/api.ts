const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export interface Document {
  id: string;
  filename: string;
  status: 'PENDING' | 'COMPLETED' | 'ERROR' | 'FAILED' | 'PARTIAL_SUCCESS';
  error_message?: string;
  chunk_count?: number;
  embedded_count?: number;
  page_count?: number;
  file_size?: number;
  created_at?: string;
  updated_at?: string;
  
  // Metadata
  title?: string;
  document_type?: string;
  department?: string;
  academic_year?: string;
  semester?: string;
  applicable_audience?: string;
  description?: string;
  topics?: string[];
  keywords?: string[];
  example_questions?: string[];
  effective_from?: string;
  effective_until?: string;
  version?: string;
  priority?: number;
}

export interface Citation {
  document_id: string;
  lineage?: {
    document_name?: string; page_ids?: string[]; page_numbers?: number[];
    block_ids?: string[];
    source_metadata?: {
      slide?: number[];
      sheet?: string[];
      section?: string[];
      rows?: number[];
      lines?: number[];
      [key: string]: any;
    };
  };
}

export interface Latencies {
  total?: number;
  generation?: number;
  retrieval?: number;
  [key: string]: number | undefined;
}

export interface Decision {
  iteration: number;
  action: string;
  query?: string[];
  reason: string;
  goal?: string;
  unresolved?: string[];
  progress?: string;
}

export interface ChatResponse {
  answer: string;
  conversation_id?: string;
  domain_state?: string;
  evidence_state?: string;
  iterations?: number;
  max_iterations?: number;
  stop_reason?: string;
  citations?: Citation[];
  latencies?: Latencies;
  decision_history?: Decision[];
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface ConversationHistory {
  id: string;
  title: string;
  messages: Message[];
}

export const api = {
  getDocuments: async (): Promise<Document[]> => {
    const res = await fetch(`${BASE_URL}/documents/`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },
  uploadDocument: async (file: File, metadata?: Record<string, any>): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            // Backend expects a JSON string for arrays
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
    }

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },
  deleteDocument: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },
  retryDocument: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/documents/${id}/retry`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to retry processing');
  },
  chat: async (query: string, conversation_id?: string, document_ids?: string[]): Promise<ChatResponse> => {
    const res = await fetch(`${BASE_URL}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, conversation_id, document_ids }),
    });
    if (!res.ok) throw new Error('Failed to chat');
    return res.json();
  },
  getConversations: async (): Promise<Conversation[]> => {
    const res = await fetch(`${BASE_URL}/conversations/`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },
  getConversationHistory: async (id: string): Promise<ConversationHistory> => {
    const res = await fetch(`${BASE_URL}/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation history');
    return res.json();
  },
  deleteConversation: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },
  getDownloadUrl: (id: string): string => {
    return `${BASE_URL}/documents/${id}/download`;
  },
  runIntelligenceAnalysis: async (request: AnalysisRequest): Promise<AnalysisResponse> => {
    const res = await fetch(`${BASE_URL}/intelligence/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': 'failureops-internal-service-key-secret',
      },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Analysis failed with status ${res.status}`);
    }
    return res.json();
  }
};

// ============================================================
// FAILUREOPS X INTELLIGENCE TYPES
// ============================================================

export type FactType = 'METRIC' | 'EVENT' | 'CLAIM' | 'STATUS' | 'POLICY' | 'INCIDENT';
export type Direction = 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN';
export type SignalCategory = 'TECHNICAL' | 'OPERATIONAL' | 'FINANCIAL' | 'ACADEMIC' | 'COMPLIANCE';
export type SignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EvidenceItem {
  evidence_id: string;
  project_id: string;
  company_id?: string;
  statement: string;
  fact_type: FactType;
  metric_name?: string;
  baseline_value?: number;
  previous_value?: number;
  current_value?: number;
  baseline_timestamp?: string;
  previous_timestamp?: string;
  current_timestamp?: string;
  baseline_to_current_change_percent?: number;
  previous_to_current_change_percent?: number;
  baseline_to_current_change?: number;
  previous_to_current_change?: number;
  unit?: string;
  direction: Direction;
  timestamp?: string;
  period?: string;
  source_document_id: string;
  source_document_name: string;
  source_chunk_id: string;
  citation: string;
  source_metadata?: Record<string, any>;
  page_numbers?: number[];
  extraction_confidence: number;
  visibility?: string;
  created_at?: string;
}

export interface EventItem {
  event_id: string;
  project_id: string;
  description: string;
  event_type: 'DEPLOYMENT' | 'RELEASE' | 'INCIDENT' | 'POLICY_CHANGE' | 'SCHEDULE_CHANGE' | 'MEETING' | 'RISK_DETECTED' | 'METRIC_ANOMALY' | 'MILESTONE' | 'OTHER';
  timestamp?: string;
  period?: string;
  source_document_id: string;
  source_document_name?: string;
  source_chunk_id: string;
  supporting_chunk_ids?: string[];
  location_type?: string;
  location_value?: string;
  page_numbers?: number[];
  citation: string;
  source_metadata?: Record<string, any>;
  confidence: number;
  created_at?: string;
}

export interface ClaimItem {
  claim_id: string;
  project_id: string;
  statement: string;
  source_speaker_or_entity?: string;
  source_document_id: string;
  source_document_name?: string;
  source_chunk_id: string;
  supporting_chunk_ids?: string[];
  location_type?: string;
  location_value?: string;
  page_numbers?: number[];
  citation: string;
  source_metadata?: Record<string, any>;
  confidence: number;
  verified_as_fact: boolean;
  created_at?: string;
}

export interface SignalRelationship {
  source_signal_name: string;
  target_signal_name: string;
  relationship_type: string;
  strength: number;
  confidence: number;
  supporting_evidence_ids: string[];
  explanation?: string;
}

export interface DimensionRiskScore {
  dimension: SignalCategory;
  risk_score: number;
  severity: SignalSeverity;
  previous_risk_score?: number;
  risk_change_percent?: number;
  risk_trend?: Direction;
  previous_score?: number;
  change_percent?: number;
  trend: Direction;
  confidence: number;
  evidence_count: number;
  evidence_ids: string[];
}

export interface NormalizedSignal {
  signal_id: string;
  project_id: string;
  company_id?: string;
  canonical_name: string;
  category: SignalCategory;
  
  // 1. Normalized Risk Score & Risk Movement
  risk_score?: number;
  previous_risk_score?: number;
  baseline_risk_score?: number;
  risk_change_percent?: number;
  risk_trend?: Direction;
  scoring_method?: string;
  polarity?: string;
  benchmark_target?: number;
  benchmark_critical?: number;
  unit?: string;
  
  // 2. Raw Source Metric & Raw Metric Movement
  baseline_value?: number;
  previous_value?: number;
  current_value?: number;
  baseline_timestamp?: string;
  previous_timestamp?: string;
  current_timestamp?: string;
  baseline_to_current_change_percent?: number;
  previous_to_current_change_percent?: number;
  baseline_to_current_change?: number;
  previous_to_current_change?: number;
  metric_change_percent?: number;
  metric_trend?: Direction;
  
  // 3. Backwards Compatibility Aliases
  previous_score?: number;
  baseline_score?: number;
  percentage_change?: number;
  change_percent?: number;
  direction: Direction;
  trend?: Direction;
  
  // 4. Metadata & Provenance
  velocity?: number;
  persistence?: string;
  severity: SignalSeverity;
  confidence: number;
  evidence_count?: number;
  supporting_evidence_ids: string[];
  evidence_ids?: string[];
  supporting_citations: string[];
  conflicting_evidence_ids?: string[];
  explanation?: string;
  created_at?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  severity: string;
}

export interface ConfidenceSummary {
  overall_confidence: number;
  evidence_count: number;
  signal_count: number;
  grounded_ratio: number;
}

export interface ProcessingMetadata {
  execution_latencies?: Record<string, number>;
  node_path?: string[];
  retrieved_chunk_count?: number;
  timestamp?: string;
  version?: string;
}

export interface AnalysisRequest {
  analysis_id?: string;
  project_id: string;
  company_id?: string;
  query: string;
  document_ids?: string[];
  options?: Record<string, any>;
}

export interface AnalysisResponse {
  analysis_id: string;
  project_id: string;
  company_id?: string;
  status: 'completed' | 'partial' | 'insufficient_evidence' | 'failed';
  evidence: EvidenceItem[];
  events: EventItem[];
  claims: ClaimItem[];
  signals: NormalizedSignal[];
  risk_dimensions?: DimensionRiskScore[];
  relationships: SignalRelationship[];
  citations: Array<{
    document_id?: string;
    document_name?: string;
    citation?: string;
    lineage?: Record<string, any>;
  }>;
  warnings: ValidationWarning[];
  confidence_summary: ConfidenceSummary;
  processing_metadata: ProcessingMetadata;
  error_message?: string;
}
