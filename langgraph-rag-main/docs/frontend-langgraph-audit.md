# FRONTEND + LANGGRAPH INTELLIGENCE INTEGRATION AUDIT & ARCHITECTURE

---

## 1. END-TO-END SYSTEM ARCHITECTURE MAP

```
                                    USER
                                      │
                                      ▼
                                  FRONTEND
                      (React 19 + TypeScript + Vite)
                                      │
                                      ├── 1. Document Management & Chat (Existing API)
                                      │     - POST /api/v1/documents/upload
                                      │     - GET /api/v1/documents/
                                      │     - POST /api/v1/chat/
                                      │
                                      └── 2. Intelligence Analysis (New LangGraph API)
                                            - POST /api/v1/intelligence/analyze
                                            │
                                            ▼
                              LANGGRAPH INTELLIGENCE SERVICE
                               (app/intelligence/graph/workflow.py)
                                            │
                                            ├── [Node 1] validate_request
                                            │     (Server-side project & doc validation)
                                            │
                                            ├── [Node 2] retrieve_evidence
                                            │     │
                                            │     ▼
                                            │   RAG ADAPTER (app/intelligence/rag/adapter.py)
                                            │     │
                                            │     ▼
                                            │   EXISTING RAG (app/services/retrieval_service.py)
                                            │     - 2048-dim pgvector Search
                                            │     - PostgreSQL BM25 (tsvector FTS)
                                            │     - Reciprocal Rank Fusion (RRF)
                                            │     - Cross-Encoder Reranker (NVIDIA Nemotron)
                                            │
                                            ├── [Node 3] evidence_agent (NVIDIA LLM JSON)
                                            │     - Extracts EvidenceItem, EventItem, ClaimItem
                                            │     - Prompt Injection Defense Boundary
                                            │
                                            ├── [Node 4] validate_evidence
                                            │     - Verifies chunk lineage & numerical sanity
                                            │
                                            ├── [Node 5] signal_agent (Zero LLM Math)
                                            │     - Canonical Taxonomy Normalization
                                            │     - Deterministic Math ((current - prev)/prev * 100)
                                            │     - Multi-Source Correlation (TECHNICAL_RELIABILITY_STRESS)
                                            │     - Grounded Candidate Relationships
                                            │
                                            ├── [Node 6] validate_signals
                                            │     - Verifies evidence links & confidence
                                            │
                                            └── [Node 7] finalize_output
                                                  - Assembles typed AnalysisResponse / IntelligenceResult
                                            │
                                            ▼
                                  STRUCTURED INTELLIGENCE RESULT
                                            │
                                            ▼
                                  FRONTEND VISUALIZATION
                        (Signals -> Evidence -> Real Document Viewer)
```

---

## 2. COMPONENT INVENTORY & INTEGRATION MATRIX

| Component | Status | Location | Responsibility |
|---|---|---|---|
| **Document Ingestion** | **Existing (Untouched)** | [`app/services/document_service.py`](file:///p:/LangGraph_rag/app/services/document_service.py) | Parses multi-format files, chunks, and generates 2048-dim pgvector embeddings. |
| **Hybrid RAG Retrieval** | **Existing (Untouched)** | [`app/services/retrieval_service.py`](file:///p:/LangGraph_rag/app/services/retrieval_service.py) | Vector cosine distance + BM25 + RRF + Cross-Encoder reranking. |
| **RAG Adapter** | **Implemented** | [`app/intelligence/rag/adapter.py`](file:///p:/LangGraph_rag/app/intelligence/rag/adapter.py) | Isolates RAG retrieval and preserves 100% of chunk lineage. |
| **Evidence Agent** | **Implemented** | [`app/intelligence/agents/evidence_agent.py`](file:///p:/LangGraph_rag/app/intelligence/agents/evidence_agent.py) | Extracts structured claims, events, and metrics with prompt injection defenses. |
| **Signal Agent** | **Implemented** | [`app/intelligence/agents/signal_agent.py`](file:///p:/LangGraph_rag/app/intelligence/agents/signal_agent.py) | Canonical taxonomy, zero LLM math ($25 \to 33 = 32\%$), and multi-source correlation. |
| **LangGraph Orchestrator** | **Implemented** | [`app/intelligence/graph/workflow.py`](file:///p:/LangGraph_rag/app/intelligence/graph/workflow.py) | 7-node linear state machine with `FailureOpsGraphState`. |
| **Intelligence API Route** | **Implemented** | [`app/intelligence/api/routes.py`](file:///p:/LangGraph_rag/app/intelligence/api/routes.py) | `POST /api/v1/intelligence/analyze` with service authentication and DB verification. |
| **Frontend API Client** | **To Extend** | [`frontend/src/api.ts`](file:///p:/LangGraph_rag/frontend/src/api.ts) | Adds typed interfaces and `runIntelligenceAnalysis()` method. |
| **Frontend Intelligence UI** | **To Implement** | [`frontend/src/components/IntelligenceView.tsx`](file:///p:/LangGraph_rag/frontend/src/components/IntelligenceView.tsx) | Signals dashboard, Evidence cards, and drilldown to real source document viewer. |

---

## 3. DATA CONTRACTS & TYPE SPECIFICATIONS

### TypeScript Interface: `AnalysisRequest`
```typescript
export interface AnalysisRequest {
  analysis_id?: string;
  project_id: string;
  company_id?: string;
  query: string;
  document_ids?: string[];
  options?: Record<string, any>;
}
```

### TypeScript Interface: `EvidenceItem`
```typescript
export interface EvidenceItem {
  evidence_id: string;
  project_id: string;
  company_id?: string;
  statement: string;
  fact_type: 'METRIC' | 'EVENT' | 'CLAIM' | 'STATUS' | 'POLICY' | 'INCIDENT';
  metric_name?: string;
  previous_value?: number;
  current_value?: number;
  unit?: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN';
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
```

### TypeScript Interface: `NormalizedSignal`
```typescript
export interface NormalizedSignal {
  signal_id: string;
  project_id: string;
  company_id?: string;
  canonical_name: string;
  category: 'TECHNICAL' | 'OPERATIONAL' | 'FINANCIAL' | 'ACADEMIC' | 'COMPLIANCE';
  current_value?: number;
  previous_value?: number;
  percentage_change?: number;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN';
  velocity?: number;
  persistence?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  supporting_evidence_ids: string[];
  supporting_citations: string[];
  conflicting_evidence_ids?: string[];
  explanation?: string;
  created_at?: string;
}
```

---

## 4. DOWNSTREAM BOUNDARY (OUT OF SCOPE)

The following engines are explicitly **NOT** implemented in this frontend-LangGraph integration:
- Failure DNA
- Failure Chain Graph
- Risk Prediction
- What-if Simulation
- Historical Memory
- Intervention Engine
- Experiment Engine
- Outcome Verification
- Executive Failure Radar
