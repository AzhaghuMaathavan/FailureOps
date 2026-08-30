====================================================
FAILUREOPS X — FORENSIC RAG/LANGGRAPH AUDIT
====================================================

1. EXECUTIVE VERDICT
REAL RAG:
YES

REAL LANGGRAPH:
YES

END-TO-END GROUNDING:
YES

CURRENT SYSTEM LEVEL:
5 (End-to-end RAG/LangGraph works correctly)

----------------------------------------------------

2. ARCHITECTURE TRACE

Frontend:
- Technology: Next.js 16.3.3 (App Router, Turbopack, Tailwind CSS, TypeScript)
- Entrypoint / Port: http://127.0.0.1:3000
- BFF API Proxy: frontend/app/api/ (Node.js runtime, cookie sessions, tenant isolation headers `x-organization-id`, `x-user-id`)
- Config: frontend/lib/server/config.ts (`BACKEND_INTERNAL_URL`, `RAG_INTERNAL_URL`)

Backend:
- Technology: FastAPI (Python 3.9 / 3.11, Uvicorn, Pydantic v2)
- Entrypoint / Port: http://127.0.0.1:8000 (rag/app/main.py)
- Routers: documents, retrieval, chat, conversations, analysis, foundation, email, intelligence

RAG:
- Services: rag/app/services/retrieval_service.py, rag/app/services/document_service.py, rag/app/services/chunking_service.py, rag/app/services/embedding_service.py
- Normalizers: Document normalizer, PyMuPDF native block extraction, CSV/XLSX multi-format parsers

LangGraph:
- Engine: LangGraph StateGraph (7-Node Pipeline)
- Definition: rag/app/intelligence/graph/workflow.py
- State: rag/app/intelligence/graph/state.py (`FailureOpsGraphState`)
- Nodes: `validate_request` -> `retrieve_evidence` -> `evidence_agent` -> `validate_evidence` -> `signal_agent` -> `validate_signals` -> `finalize_output`

Database:
- PostgreSQL 16 (or SQLite in isolated test harnesses) with SQLAlchemy ORM
- Connection: rag/app/db/database.py (`POSTGRES_URL`)

Vector Store:
- pgvector extension with L2/Cosine similarity operator `<=>`
- Model: `nvidia/llama-nemotron-embed-vl-1b-v2` (2048-dimensional vectors)

RustFS / Object Storage:
- Implementation: rag/app/core/object_storage.py & rag/app/core/storage.py
- Providers: RustFS S3-compatible object storage with local encrypted disk fallback

----------------------------------------------------

3. DOCUMENT INGESTION TRACE

Upload:
PASS — Received via `POST /api/v1/documents/upload` and processed via `ingest_upload` (rag/app/services/ingest_service.py).

Storage:
PASS — Materialized to object storage / filesystem (`persist_upload` in rag/app/core/storage.py), recorded in `documents` table with `id`, `filename`, `project_id`, `organization_id`, `visibility`.

Parsing:
PASS — Multi-format parser (`process_document` in rag/app/services/document_service.py, PyMuPDF, `parse_txt_to_blocks`, `parse_csv_to_blocks`, `parse_docx_to_blocks`, `parse_xlsx_to_blocks`, `parse_markdown_to_blocks`) parsed text into `document_blocks`.

Chunking:
PASS — Semantic & structural chunker (`create_chunks_for_document` in rag/app/services/chunking_service.py) generated indexed `chunks` with full lineage, headers, and section boundaries.

Embedding:
PASS — `generate_embeddings` (rag/app/services/embedding_service.py) populated 2048-dim vectors using `nvidia/llama-nemotron-embed-vl-1b-v2` with `embedding_status = 'COMPLETED'`.

----------------------------------------------------

4. RETRIEVAL TRACE

Dense:
PASS — pgvector similarity search via `retrieve_candidates` (`Chunk.embedding.op("<=>")` in rag/app/services/retrieval_service.py#L25) returning top-k scored candidates.

BM25:
PASS — Full-text tsvector/tsquery lexical search via `retrieve_bm25_candidates` (`to_tsvector @@ websearch_to_tsquery` in rag/app/services/retrieval_service.py#L190).

Hybrid:
PASS — Enabled via `search_knowledge_base` combining dense vector candidates and BM25 candidates with multi-tenant and project scoping.

RRF:
PASS — `reciprocal_rank_fusion` (rag/app/services/retrieval_service.py#L232) fused ranks using formula `score = Σ(1 / (k + rank))`.

Reranking:
PASS — Cross-encoder reranking via NVIDIA Rerank API (`nvidia/nv-embedqa-mistral-7b-v2` / `rerank_candidates` in rag/app/services/retrieval_service.py#L73) reordering candidates with real logit scores.

----------------------------------------------------

5. LANGGRAPH TRACE

Graph executed:
PASS — Compiled LangGraph `FailureOpsGraphState` executed all 7 nodes from START to END.

Nodes executed:
`START` -> `validate_request` -> `retrieve_evidence` -> `evidence_agent` -> `validate_evidence` -> `signal_agent` -> `validate_signals` -> `finalize_output` -> `END`

Retrieved chunks entered graph:
PASS — `RAGAdapter.retrieve` (rag/app/intelligence/rag/adapter.py) formatted chunks preserving citations and injected them into state `retrieved_chunks`.

Evidence Agent grounded:
PASS — `EvidenceAgent.extract_evidence` (rag/app/intelligence/agents/evidence_agent.py) parsed facts, events, claims, and time-series telemetry strictly from the retrieved chunks.

Signal Agent grounded:
PASS — `SignalAgent.synthesize_signals` (rag/app/intelligence/agents/signal_agent.py) converted extracted evidence into domain signals and computed normalized risk scores (0–100).

----------------------------------------------------

6. LLM GROUNDING

Retrieved chunk reached LLM:
PASS — Chunk text formatted with citation headers (`--- [CHUNK 1 | Source: {citation} | ID: {cid}] ---`) injected directly into extraction and QA prompts.

LLM output depended on document:
PASS — In the live test query, the LLM returned exact ground truth (`17 timeout failures on 2026-08-30 after deployment version RAG-AUDIT-17`), which existed nowhere else in the codebase or database.

Hallucination risk:
LOW — Deterministic grounding validator (`validate_evidence_citation` in rag/app/services/citation_validator.py) checks numerical token matches, keyword overlap, and reranker logits. When chunks were removed (negative test), the system returned `None` rather than inventing false facts.

----------------------------------------------------

7. PERSISTENCE

Evidence:
PASS — Persisted in `evidence_items` table and serialized into `ProjectAnalysis.evidence_packet`.

Events:
PASS — Persisted as structured `INCIDENT_REPORTS` / `DEPLOYMENT` events with confidence scores.

Claims:
PASS — Persisted as structured `CUSTOMER_FEEDBACK` claims with attribution.

Metrics:
PASS — Persisted with baseline, previous, current chronological telemetry and percentage changes.

Signals:
PASS — Persisted in `signal_items` table and `ProjectAnalysis.signal_packet`.

Provenance:
PASS — Every evidence item contains `source_document_id`, `source_chunk_id`, `page_numbers`, `row_numbers`, and verified citation labels.

----------------------------------------------------

8. FRONTEND AUDIT

Evidence Intelligence (/projects/[id]/evidence):
REAL — Fetches live Evidence Packet from `/api/evidence?projectId=${id}`.

Signal Explorer (/projects/[id]/signals):
REAL — Fetches live Signal Packet from `/api/signals?projectId=${id}`.

Failure DNA (/projects/[id]/dna):
REAL — Fetches live Failure DNA dimension scores from `/api/dna?projectId=${id}`.

Radar (/projects/[id]/radar):
REAL — Fetches live Radar data from `/api/radar?projectId=${id}`.

Prediction (/projects/[id]/prediction):
REAL — Fetches live Failure Prediction from `/api/projects/${id}/prediction` alias (`/api/v1/projects/${id}/failure-prediction`).

Interventions (/projects/[id]/interventions):
REAL — Fetches live Careflow Interventions from `/api/interventions?projectId=${id}`.

Causal Analysis (/projects/[id]/causal):
REAL — Fetches live Failure Chain graph from `/api/projects/${id}/causal` alias (`/api/v1/projects/${id}/failure-chain`).

What-If (/projects/[id]/simulation):
REAL — Executes live scenario simulations on backend via `/api/simulation?projectId=${id}`.

Experiments (/projects/[id]/experiment):
REAL — Executes live experiment lifecycle (Start -> Verify -> Outcome) via `/api/experiments?projectId=${id}`.

Outcome (/projects/[id]/outcomes):
REAL — Fetches validated learnings and experiment outcomes from `/api/outcomes?projectId=${id}`.

----------------------------------------------------

9. DUPLICATE EVIDENCE ROOT CAUSE

Root Cause:
When a source document contains multiple subsections or bullet points under a single document header (e.g. "9. Current Product Assumptions" on Page 5 of `fintech.pdf`), the chunk header was used as the title fallback for distinct statement extractions. The backend assigned distinct IDs (`ev_item_1`, `ev_item_2`), but because the title extracted matched the section header, the UI rendered repeated cards with identical titles.
Resolved by:
1. `consolidate_duplicates_and_conflicts` in rag/app/services/citation_validator.py deduplicating identical metric topics.
2. `TimeSeriesEngine` merging repetitive tabular rows into canonical multi-point time series.

----------------------------------------------------

10. SOURCE OPENING ROOT CAUSE

Root Cause:
Previously, clicking "Open Source" in the UI lacked a direct route to stream raw files from Object Storage/RustFS.
Resolved by:
1. Backend route `GET /api/v1/documents/{document_id}/download` reading bytes from Object Storage (`materialize_document_file` in rag/app/core/object_storage.py).
2. Frontend proxy route `frontend/app/api/documents/[id]/download/route.ts` streaming file buffers directly with proper MIME types (HTTP 200).

----------------------------------------------------

11. PRIVACY AUDIT

- Multi-tenant isolation verified: Tenant A cannot query, retrieve, or view documents/chunks/evidence belonging to Tenant B.
- SQL queries in `retrieval_service.py` strictly enforce `organization_id = :org_id` and `project_id = :proj_id`.
- Tenant context is enforced in backend via `get_tenant_context` dependency and in frontend BFF via encrypted session cookies.

----------------------------------------------------

12. RATE LIMIT / MULTIPLE CALL AUDIT

- LLM Key Rotation Manager (`rag/app/services/llm_key_manager.py`) manages rate limits, handling HTTP 429s with exponential backoff and multi-key rotation.
- Frontend Next.js BFF (`frontend/lib/server/rate-limit.ts`) enforces per-IP token bucket rate limiting (240 req/min general, 30 req/min analysis, 30 req/min upload).

----------------------------------------------------

13. DATA LOSS POINT

LangGraph:
- No data loss. `FailureOpsGraphState` preserves full chunk lineage (`document_name`, `page_numbers`, `row_numbers`, `citations`).

DB:
- No data loss. `ProjectAnalysis` table stores complete `evidence_packet`, `signal_packet`, `failure_dna`, and `failure_chain`.

API:
- No data loss. FastAPI routes return complete typed Pydantic models.

Frontend:
- No data loss. Next.js API routes forward complete payloads, and client pages render telemetry time-series, dimension cards, and citation drawers.

----------------------------------------------------

14. UNIQUE TEST DOCUMENT PROOF

Document:
rag_audit_unique.txt

Document ID:
doc_audit_ae84d21d

Chunk:
chunk_id=00e5b708-8395-47c9-a58c-147238097a43 (content contains `FAILUREOPS_RAG_AUDIT_TOKEN_987654`)

Vector:
2048-dim embedding (status: COMPLETED)

Retrieved:
Exact chunk retrieved for query "What happened to the Orion payment gateway after deployment RAG-AUDIT-17?"

LangGraph Job:
Executed 7 nodes: validate_request -> retrieve_evidence -> evidence_agent -> validate_evidence -> signal_agent -> validate_signals -> finalize_output

Evidence:
Extracted Event: `[INCIDENT] Orion payment gateway experienced exactly 17 timeout failures on 2026-08-30 after deployment RAG-AUDIT-17`

Source:
rag_audit_unique.txt (Page 1)

----------------------------------------------------

15. RECOMMENDED NEXT STEP

ONE PRIMARY RECOMMENDATION:
The end-to-end RAG, LangGraph multi-agent pipeline, and frontend intelligence views are verified and fully functional. Proceed with normal project workflows, live document uploads, and automated regression monitoring.

----------------------------------------------------

16. DO NOT FIX YET

- Do NOT rewrite or modify the 7-node LangGraph pipeline (`rag/app/intelligence/graph/workflow.py`).
- Do NOT alter the pgvector retrieval and RRF fusion algorithms (`rag/app/services/retrieval_service.py`).
- Do NOT remove multi-tenant privacy filters in `rag/app/core/tenant.py` and `frontend/lib/server/auth.ts`.
- Do NOT modify the core risk scoring engine in `rag/app/intelligence/agents/signal_agent.py`.
====================================================
