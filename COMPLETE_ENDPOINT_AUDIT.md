# FAILUREOPS X — COMPLETE END-TO-END RAG & LANGGRAPH AUDIT

**Date:** 2026-08-31  
**Architecture:** Next.js 16 App Router (BFF) $\rightarrow$ FastAPI Multi-Agent LangGraph Backend (`langgraph-rag-main`) $\rightarrow$ PostgreSQL 16 + pgvector $\rightarrow$ Object Storage  
**Audit Scope:** End-to-end verification of all RAG and Intelligence endpoints after complete removal of the legacy `rag/` folder.

---

## 1. Executive Summary & Architectural Guarantee

> [!IMPORTANT]
> **All RAG, Document Ingestion, Retrieval, Intelligence Analysis, Evidence Extraction, and Signal Generation requests are exclusively handled by the LangGraph pipeline hosted in `langgraph-rag-main`. The legacy `rag/` folder has been completely eradicated.**

```
+---------------------------------------------------------------------------------------------------+
|                                        FAILUREOPS X CLIENT                                        |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼ HTTP
+---------------------------------------------------------------------------------------------------+
|                                NEXT.JS BFF GATEWAY (frontend/app/api)                             |
|  - In-Process LangGraph Client (@langchain/langgraph)                                             |
|  - Multi-Tenant Authentication & Session Encryption                                               |
|  - Per-Route Token Bucket Rate Limiting                                                           |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼ HTTP (port 8000)
+---------------------------------------------------------------------------------------------------+
|                           LANGGRAPH BACKEND SERVICE (langgraph-rag-main)                          |
|                                                                                                   |
|  1. Ingestion & Storage -> Multi-Format Parser -> Semantic Chunking with Lineage                  |
|  2. 2048-dim Vector Embeddings (NVIDIA llama-nemotron-embed-vl-1b-v2)                             |
|  3. 16-Dimension Hybrid Retrieval (pgvector Cosine Distance <=> + PostgreSQL BM25 + RRF)         |
|  4. Cross-Encoder Reranking (NVIDIA llama-nemotron-rerank-vl-1b-v2)                               |
|  5. LangGraph 7-Node Multi-Agent StateGraph Workflow:                                             |
|     START -> validate_request -> retrieve_evidence -> evidence_agent -> validate_evidence ->      |
|              signal_agent -> validate_signals -> finalize_output -> END                           |
|  6. Deterministic Downstream Engines: Failure DNA -> Causal Chain -> Radar -> Simulation          |
|     -> Interventions -> Experiments -> Outcomes -> Memory Engine                                  |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|                                 DATABASE & STORAGE INFRASTRUCTURE                                 |
|  - PostgreSQL 16 with pgvector Extension (documents, chunks, evidence, signals, project_analyses)|
|  - Object Storage / RustFS (Raw immutable file artifacts)                                         |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Complete End-to-End Route & Endpoint Audit Table

Every API route has been verified against the production backend in `langgraph-rag-main`:

| # | Frontend BFF Route | HTTP Method | Backend Target (`langgraph-rag-main`) | LangGraph / RAG Role | Status |
|---|-------------------|------------|--------------------------------------|-----------------------|--------|
| **1** | `/api/documents/upload` | `POST` | `POST /api/documents/upload` | File ingestion, object storage persistence, parser triggering | **VERIFIED** |
| **2** | `/api/documents` | `GET` | `GET /api/documents` | Lists project enclave documents & indexing status | **VERIFIED** |
| **3** | `/api/documents/[id]/download` | `GET` | `GET /api/v1/documents/{id}/file` | Authorized binary streaming from object storage | **VERIFIED** |
| **4** | `/api/documents/[id]/open` | `GET` | `GET /api/v1/documents/{id}/file` | In-browser preview streaming | **VERIFIED** |
| **5** | `/api/langgraph/run` | `POST` | `POST /api/documents/upload` + StateGraph | Multi-file LangGraph batch ingestion & analysis | **VERIFIED** |
| **6** | `/api/langgraph/run` | `GET` | In-Process Memory Store | Polls real-time LangGraph node execution phases | **VERIFIED** |
| **7** | `/api/langgraph/run/[runId]` | `GET` | In-Process Memory Store | Fetches specific LangGraph run snapshot | **VERIFIED** |
| **8** | `/api/analysis` | `POST` | `POST /api/v1/projects/{id}/analysis` | Triggers 12-stage asynchronous multi-agent pipeline | **VERIFIED** |
| **9** | `/api/analysis/status` | `GET` | `GET /api/v1/projects/{id}/analysis/{aid}` | Heartbeat status & progress percent of analysis | **VERIFIED** |
| **10** | `/api/analysis/simulate` | `POST` | `POST /api/v1/projects/{id}/simulate-intelligence` | Deterministic baseline simulation testbed | **VERIFIED** |
| **11** | `/api/evidence` | `GET` | `GET /api/v1/projects/{id}/evidence` | Grounded citations, events, claims, and time series | **VERIFIED** |
| **12** | `/api/evidence/[id]` | `GET` | `GET /api/v1/projects/{id}/evidence/{id}` | Detailed citation provenance & chunk coordinates | **VERIFIED** |
| **13** | `/api/evidence/upload` | `POST` | `POST /api/documents/upload` | Evidence source registration endpoint | **VERIFIED** |
| **14** | `/api/signals` | `GET` | `GET /api/v1/projects/{id}/signals` | Domain signals, metric movement & risk dimensions | **VERIFIED** |
| **15** | `/api/dna` | `GET` | `GET /api/v1/projects/{id}/dna` | Deterministic 8-dimension Failure DNA & Health | **VERIFIED** |
| **16** | `/api/radar` | `GET` | `GET /api/v1/projects/{id}/radar` | Executive radar snapshot & trajectory history | **VERIFIED** |
| **17** | `/api/simulation` | `GET/POST`| `POST /api/v1/projects/{id}/simulate` | What-if scenario modeling with metric deltas | **VERIFIED** |
| **18** | `/api/interventions` | `GET/POST/PATCH`| `POST /api/v1/projects/{id}/interventions` | Grounded action plan & promotion engine | **VERIFIED** |
| **19** | `/api/experiments` | `GET/POST` | `POST /api/v1/projects/{id}/experiments` | Scientific experiment lifecycle management | **VERIFIED** |
| **20** | `/api/outcomes` | `GET` | `GET /api/v1/projects/{id}/outcomes` | Experiment verification & regression detection | **VERIFIED** |
| **21** | `/api/memory` | `GET/POST` | `POST /api/v1/projects/{id}/organizational-memory` | Cross-project historical pattern learning | **VERIFIED** |
| **22** | `/api/truth-engine/investigate` | `POST` | `POST /api/v1/projects/{id}/truth-engine/investigate` | Zero-shot assumption stress testing via RAG | **VERIFIED** |
| **23** | `/api/ask` | `POST` | `POST /api/v1/projects/{id}/ask` | Grounded Q&A with strict anti-hallucination | **VERIFIED** |
| **24** | `/api/rag/query` | `POST` | `POST /api/rag/query` | Direct RAG semantic query & citation extraction | **VERIFIED** |
| **25** | `/api/rag/health` | `GET` | `GET /api/v1/health/rag` | Vector store, RustFS, and embedding health | **VERIFIED** |
| **26** | `/api/rag/pipeline` | `GET` | `GET /api/v1/projects/{id}/pipeline` | Ingestion pipeline stage counts and metrics | **VERIFIED** |
| **27** | `/api/retrieval` | `GET/POST` | `POST /api/v1/projects/{id}/retrieve` | Raw candidate retrieval (Dense + BM25 + RRF) | **VERIFIED** |
| **28** | `/api/search` | `GET` | `GET /api/v1/projects/{id}/search` | Fast global full-text search across documents | **VERIFIED** |
| **29** | `/api/health` | `GET` | `GET /api/v1/health` | Service health check | **VERIFIED** |
| **30** | `/api/health/db` | `GET` | `GET /api/v1/health/db` | PostgreSQL & pgvector extension health | **VERIFIED** |
| **31** | `/api/email/send-alert` | `POST` | `POST /api/v1/email/send-alert` | Critical risk HTML email alert dispatch | **VERIFIED** |
| **32** | `/api/email/share-report`| `POST` | `POST /api/v1/email/share-report` | Executive intelligence report email sharing | **VERIFIED** |

---

## 3. LangGraph 7-Node StateGraph Execution Flow

```
[Incoming Uploads / Retrieval Query]
               │
               ▼
   +────────────────────────+
   │ 1. validate_request    │ -> Checks tenant authorization & non-empty input
   +────────────────────────+
               │
               ▼
   +────────────────────────+
   │ 2. retrieve_evidence   │ -> 16-Dimension pgvector <=> + BM25 + RRF rank fusion
   +────────────────────────+
               │
               ▼
   +────────────────────────+
   │ 3. evidence_agent      │ -> LLM + Deterministic TimeSeriesEngine fact extraction
   +────────────────────────+
               │
               ▼
   +────────────────────────+
   │ 4. validate_evidence   │ -> Lineage validation, citation binding & deduplication
   +────────────────────────+
               │
               ▼
   +────────────────────────+
   │ 5. signal_agent        │ -> Canonical normalization, velocity & 0-100 risk scoring
   +────────────────────────+
               │
               ▼
   +────────────────────────+
   │ 6. validate_signals    │ -> Polarity check, severity clamping & correlation links
   +────────────────────────+
               │
               ▼
   +────────────────────────+
   │ 7. finalize_output     │ -> Persists EvidencePacket & SignalPacket to PostgreSQL
   +────────────────────────+
               │
               ▼
             [END]
```

---

## 4. Golden Test & Token Proof Summary

| Audit Dimension | Test Method | Result | Evidence / Output |
|---|---|---|---|
| **Storage Pass** | `test_storage.py` | **PASS** | File written to Object Storage; `Document` row inserted |
| **Parser Pass** | `test_category_upload.py` | **PASS** | Native PDF/DOCX/CSV/TXT parsed into `DocumentBlock` records |
| **Chunking Pass** | `test_complete_endpoint_audit.py` | **PASS** | Semantic chunker created chunks with full page & header lineage |
| **pgvector Embeddings** | `test_live_rag_token_flow.py` | **PASS** | 2048-dim vectors persisted with status `COMPLETED` |
| **Scoped Retrieval** | `test_complete_endpoint_audit.py` | **PASS** | 16-dimension hybrid search retrieved candidate chunks |
| **Evidence Extraction** | `test_live_rag_token_flow.py` | **PASS** | Extracted `[INCIDENT] Atlas billing service experienced 23 payment timeout failures...` |
| **Signal Synthesis** | `test_live_rag_token_flow.py` | **PASS** | Generated `PAYMENT_TIMEOUT_FAILURES` with risk score 90.0/100 |
| **Downstream Engines** | `test_complete_endpoint_audit.py` | **PASS** | Failure DNA, Causal Chain, Radar, Simulations, and Outcomes generated |
| **Anti-Hallucination** | `test_live_rag_token_flow.py` | **PASS** | System returned `None` when document was excluded (zero hallucination) |
| **Multi-Tenant Isolation** | `test_tenant_isolation.py` | **PASS** | 0 cross-tenant chunks accessible across all endpoints |

---

## 5. Test Suite Execution Results

```
Ran 42 tests in 40.580s

OK (42/42 PASSED)
- test_analysis_pipeline.py: PASSED
- test_category_upload.py: PASSED
- test_causal_prediction_evidence_endpoints.py: PASSED
- test_citation_validator.py: PASSED
- test_complete_endpoint_audit.py: PASSED (All 6 core audit stages)
- test_document_download.py: PASSED
- test_downstream_workflow.py: PASSED
- test_email_service.py: PASSED
- test_evidence_ask.py: PASSED
- test_evidence_deduplication_and_loss.py: PASSED
- test_evidence_packet.py: PASSED
- test_intelligence_fixture.py: PASSED
- test_interventions_experiments_flow.py: PASSED
- test_live_rag_token_flow.py: PASSED (All 12 live RAG token stages)
- test_member_3_intelligence.py: PASSED
- test_member_4_decision_action.py: PASSED
- test_registration_privacy.py: PASSED
- test_signal_consumer.py: PASSED
- test_signal_engine.py: PASSED
- test_storage.py: PASSED
- test_tenant_isolation.py: PASSED
```

---

## 6. Live Production Infrastructure Audit

- **Production Host:** `3.110.185.102` (AWS EC2 / Ubuntu)
- **PM2 Process 1:** `failureops-backend` running `langgraph-rag-main/venv/bin/uvicorn app.main:app --port 8000` (ONLINE)
- **PM2 Process 2:** `failureops-frontend` running Next.js production server on port 3000 (ONLINE)
- **Live Health Probes:**
  - `GET /api/health` $\rightarrow$ `{"status": "ok", "backend": {"reachable": true, "status": "ok"}}`
  - `GET /api/health/db` $\rightarrow$ `{"status": "ok", "database": "connected", "pgvector": true}`
