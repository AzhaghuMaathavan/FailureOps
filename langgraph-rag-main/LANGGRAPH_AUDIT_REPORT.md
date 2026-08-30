# FAILUREOPS X — LANGGRAPH INTELLIGENCE SERVICE AUDIT REPORT

---

## 1. EXISTING RAG SPECIFICATION

- **Ingestion Interface**: [`app.services.document_service.process_document(document_id: str, file_path: str)`](file:///p:/LangGraph_rag/app/services/document_service.py#L49)
  - Supports: PDF (PyMuPDF + Nemotron Parse VLM), DOCX, PPTX, XLSX, CSV, Markdown, TXT, JSON.
  - Chunking: Layout-aware with 1500 char soft limit, heading path in `headers` JSONB, lineage in `lineage` JSONB.
  - Embeddings: NVIDIA 2048-dim (`nvidia/llama-nemotron-embed-vl-1b-v2`) in batches of 16 stored in `chunks.embedding` (`Vector(2048)`).
- **Retrieval Interface**: [`app.services.retrieval_service.search_knowledge_base(db: Session, query_text: str, document_ids: Optional[List[str]] = None, filters: Optional[Dict[str, Any]] = None)`](file:///p:/LangGraph_rag/app/services/retrieval_service.py#L237)
- **Input Parameters**:
  - `db`: SQLAlchemy database session.
  - `query_text`: String query.
  - `document_ids`: Optional list of UUID strings.
  - `filters`: Optional dictionary from `analyze_query()`.
- **Output Schema**: `Tuple[List[Dict[str, Any]], Dict[str, float], List[Dict[str, Any]]]`
  - `chunk_id`: String UUID
  - `document_id`: String UUID
  - `content`: Extracted text content
  - `headers`: `{"title": str, "section_path": List[str]}`
  - `lineage`: `{"document_name": str, "page_numbers": List[int], "page_ids": List[str], "block_ids": List[str], "source_metadata": Dict[str, Any]}`
  - `vector_distance`: pgvector cosine distance float
  - `bm25_score`: PostgreSQL `ts_rank_cd` float
  - `rerank_score`: Cross-encoder logit score float (`nvidia/llama-nemotron-rerank-vl-1b-v2`)
  - `rank`: Integer rank
- **Citation Fields**: `citation` string (e.g. `engineeringmetrics.csv (Pages: 1)`), `page_numbers`, `source_metadata` (slide, sheet, row, line).
- **Empty Retrieval Behavior**: Returns `([], {"total_retrieval_time": float}, [])`.

---

## 2. RAG ADAPTER SPECIFICATION

- **Location**: [`app/intelligence/rag/adapter.py`](file:///p:/LangGraph_rag/app/intelligence/rag/adapter.py)
- **Class**: `RAGAdapter.retrieve(db, query, project_id, company_id, document_ids, options)`
- **Lineage Preservation**: Maps 100% of candidate attributes into state without mutation.

---

## 3. EVIDENCE AGENT & PROMPT INJECTION DEFENSE

- **Location**: [`app/intelligence/agents/evidence_agent.py`](file:///p:/LangGraph_rag/app/intelligence/agents/evidence_agent.py)
- **Model**: `nvidia/nemotron-3-super-120b-a12b`
- **Output**: Typed `EvidenceItem`, `EventItem`, `ClaimItem`
- **Prompt Injection Defense**: Untrusted chunk boundaries `--- [CHUNK {i} | Source: ... | ID: ...] ---` ensure document text cannot override execution logic.
- **Section-Independent JSON Recovery**: Recovers partial chunks independently across events, claims, and evidence.

---

## 4. METRIC-AWARE RISK SCORING & ZERO LLM MATH

- **Location**: [`app/intelligence/agents/signal_agent.py`](file:///p:/LangGraph_rag/app/intelligence/agents/signal_agent.py), [`app/intelligence/services/risk_scoring_engine.py`](file:///p:/LangGraph_rag/app/intelligence/services/risk_scoring_engine.py), [`app/intelligence/services/calculations.py`](file:///p:/LangGraph_rag/app/intelligence/services/calculations.py)
- **Deterministic Math**:
  $$\text{percentage\_change} = \frac{\text{current} - \text{previous}}{|\text{previous}|} \times 100$$
- **Metric-Aware Scoring**:
  - `HIGHER_IS_WORSE` (e.g. Latency $370\text{ ms} \to \text{Risk } 54.0\text{ MEDIUM}$)
  - `LOWER_IS_WORSE` (e.g. Availability $94.2\% \to \text{Risk } 80.3\text{ CRITICAL}$)
  - `NEUTRAL_INFORMATIONAL` (e.g. Volume $7.2\text{ M} \to \text{Risk } 15.0\text{ LOW}$)
  - `BASELINE_RELATIVE_DELTA` (Trajectory degradation for custom metrics)
- **Zero LLM Math**: LLM is never called for arithmetic.

---

## 5. LANGGRAPH STATE MACHINE

- **State**: `FailureOpsGraphState` ([`state.py`](file:///p:/LangGraph_rag/app/intelligence/graph/state.py))
- **Execution Path**:
  `START -> validate_request -> retrieve_evidence -> evidence_agent -> validate_evidence -> signal_agent -> validate_signals -> finalize_output -> END`
