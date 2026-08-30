# FailureOps X — End-to-End Data Flow Specification

This document traces the data lifecycle through the 14-stage FailureOps X pipeline:

```
USER
  ↓ (1. Upload Documents / Create Project)
FRONTEND (Next.js 16 UI)
  ↓ (2. BFF Secure Proxy /api/*)
BACKEND API (FastAPI)
  ↓ (3. Document Ingestion / Storage)
RUSTFS OBJECT STORAGE (:9000) & POSTGRESQL (:5432)
  ↓ (4. Multi-format OCR & Docling/PyMuPDF Parsing)
SEMANTIC CHUNKING SERVICE
  ↓ (5. NVIDIA 2048-dim Dense Embeddings)
PGVECTOR VECTOR STORE
  ↓ (6. Candidate Retrieval & Lineage Tracking)
EVIDENCE AGENT (Structured EvidenceItem extraction)
  ↓ (7. Anomaly & Metric Deviation Detection)
SIGNAL AGENT (Severity-weighted Signal items)
  ↓ (8. Dependency & Causal Chain Graph)
PATTERN AGENT (Archetype & Causal DAG generation)
  ↓ (9. 6-Dimensional Fingerprinting)
FAILURE DNA ENGINE (Vulnerability scoring 0-100)
  ↓ (10. Historical Similarity Search)
ORGANIZATIONAL MEMORY ENCLAVE (Sanitized case matching)
  ↓ (11. Deterministic Trajectory Forecast)
FAILURE RADAR & PREDICTION AGENT (Next failure forecast)
  ↓ (12. Mitigation Planning)
INTERVENTION & EXPERIMENT AGENT (A/B testing designs)
  ↓ (13. Real-world Operational Feedback)
OUTCOME VERIFICATION ENGINE
  ↓ (14. Sanitization & Knowledge Promotion)
SANITIZED GLOBAL KNOWLEDGE BASE
```

---

## Stage Details & Data Envelopes

### 1. Document Ingestion & Chunking
- Documents uploaded via `/api/v1/projects/{id}/documents/upload` are streamed to RustFS native S3 (`https://storage.shyxon.com`).
- Text is extracted via Docling/PyMuPDF with structure awareness (headers, tables, paragraphs).
- Chunks preserve `page_number`, `section_header`, `start_char`, `end_char`, and deterministic hash IDs.

### 2. Embeddings & Retrieval
- NVIDIA Nemotron embedding service generates 2048-dimensional vectors stored in `chunks.embedding`.
- Vector similarity is queried using cosine distance `<=>` in `pgvector` alongside hybrid keyword filters.

### 3. Evidence & Signal Pipeline
- `EvidenceAgent` transforms raw chunks into typed facts, metrics, and anomalies with source citations.
- `SignalAgent` aggregates evidence into directional warning signals with trends (`INCREASING`, `DECREASING`, `STABLE`).

### 4. Failure DNA & Radar
- `FailureDNAEngine` maps signals into Technical, Operational, Adoption, Execution, Financial, and Customer dimensions.
- `FailureRadarEngine` combines dimensional risk, trajectory velocity, and historical parallels to forecast upcoming failure points.

### 5. Interventions & Memory Promotion
- `InterventionEngine` pairs predictions with proven historical countermeasures.
- Post-resolution outcomes are verified and promoted to `GLOBAL_SANITIZED` memory after stripping proprietary tenant metadata.
