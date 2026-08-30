# FailureOps X — API Contracts & Schema Specifications

This document defines the REST and BFF proxy contracts for FailureOps X.

---

## 1. Project Management

### `POST /api/v1/projects`
Creates a new project within the authenticated organization.

**Request Body:**
```json
{
  "id": "aurora",
  "name": "Aurora Cloud Analytics",
  "company": "Aurora Technologies Inc.",
  "industry": "Cloud Infrastructure",
  "stage": "Scaling",
  "description": "Real-time enterprise distributed stream processing engine.",
  "privacy_level": "ORGANIZATION"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "aurora",
    "name": "Aurora Cloud Analytics",
    "created_at": "2026-08-30T05:00:00Z",
    "privacy_level": "ORGANIZATION"
  }
}
```

---

## 2. Document Ingestion & RAG

### `POST /api/v1/projects/{project_id}/documents/upload`
Uploads and parses a project artifact (PDF, DOCX, CSV, TXT, PPTX, XLSX, JSON) into RustFS object storage and pgvector chunk embeddings.

**Form Data:**
- `file`: Binary file stream
- `source_type`: `PRODUCT_PLAN | CUSTOMER_FEEDBACK | PRODUCT_METRICS | ENGINEERING_METRICS | TEAM_OPERATIONS | INCIDENT_REPORTS`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "document_id": "doc_463028ca7f9c",
    "filename": "incident_report.pdf",
    "source_type": "INCIDENT_REPORTS",
    "storage_provider": "rustfs",
    "chunks_created": 14,
    "embeddings_generated": 14,
    "status": "COMPLETED"
  }
}
```

---

## 3. Analysis & Intelligence Orchestration

### `POST /api/v1/projects/{project_id}/analysis`
Triggers the multi-stage intelligence analysis pipeline across all project evidence.

**Response (`200 OK`):**
```json
{
  "project_id": "aurora",
  "analysis_id": "anl_89f02c91",
  "status": "COMPLETED",
  "metrics": {
    "evidence_count": 18,
    "signals_detected": 11,
    "overall_risk_score": 78.4,
    "dominant_archetype": "Architectural Debt Under Scale"
  },
  "completed_at": "2026-08-30T05:02:15Z"
}
```

---

## 4. Evidence & Signals

### `GET /api/v1/projects/{project_id}/evidence`
Retrieves citation-backed evidence items extracted from uploaded documents.

**Response (`200 OK`):**
```json
{
  "project_id": "aurora",
  "evidence": [
    {
      "id": "evi_01",
      "project_id": "aurora",
      "source_id": "doc_463028ca7f9c",
      "source_type": "INCIDENT_REPORTS",
      "document_name": "incident_report.pdf",
      "page_or_section": "Page 3",
      "evidence_type": "ANOMALY",
      "claim": "P99 ingestion latency spiked to 4.8s during peak traffic window.",
      "value": "4.8",
      "unit": "seconds",
      "confidence": 0.96,
      "visibility": "ORGANIZATION",
      "snippet_context": "The stream ingestion queue saturated all socket worker threads at 14:00 UTC."
    }
  ]
}
```

### `GET /api/v1/projects/{project_id}/signals`
Retrieves synthesized warning signals and anomaly trends.

**Response (`200 OK`):**
```json
{
  "project_id": "aurora",
  "signals": [
    {
      "id": "sig_01",
      "name": "Ingestion Queue Buffer Exhaustion",
      "category": "TECHNICAL",
      "direction": "NEGATIVE",
      "severity": "CRITICAL",
      "trend": "INCREASING",
      "confidence": 0.94,
      "metric_change": "+340% latency increase",
      "supporting_evidence_ids": ["evi_01"],
      "detected_at": "2026-08-30T05:00:00Z"
    }
  ]
}
```

---

## 5. Failure DNA & Failure Radar

### `GET /api/v1/projects/{project_id}/failure-dna`
Retrieves the 6-dimensional Failure DNA risk distribution.

**Response (`200 OK`):**
```json
{
  "project_id": "aurora",
  "overall_risk": 78,
  "dominant_archetype": "Architectural Debt Under Scale",
  "dimensions": [
    {
      "dimension": "Technical",
      "score": 88,
      "severity": "CRITICAL",
      "primary_drivers": ["Ingestion buffer saturation", "Unbounded query thread spawning"],
      "evidence_confidence": 0.95,
      "historical_correlation": "Matches 89% of high-concurrency stream failures",
      "why_explanation": "Synchronous worker pool locks under sudden write bursts."
    },
    {
      "dimension": "Operational",
      "score": 64,
      "severity": "HIGH",
      "primary_drivers": ["Alert fatigue in SRE triage"],
      "evidence_confidence": 0.88,
      "historical_correlation": "Correlates with 72% of SLA breach incidents",
      "why_explanation": "Lack of automated backpressure throttling alerts."
    }
  ],
  "generated_at": "2026-08-30T05:02:15Z"
}
```

### `GET /api/v1/projects/{project_id}/predictions` (Failure Radar)
Forecasts failure trajectories and the most probable next catastrophic failure.

**Response (`200 OK`):**
```json
{
  "project_id": "aurora",
  "predicted_failure": "Cascading Cluster Halt under Q4 Cyber Week Traffic Spike",
  "probability": 0.84,
  "confidence": 0.91,
  "timeframe": "2-4 Weeks",
  "supporting_signals": ["sig_01", "sig_04"],
  "historical_matches": ["hist_atlas_scaling"],
  "explanation": "If current throughput growth continues without async backpressure decoupling, socket pools will freeze under 2.5x traffic.",
  "urgency": "IMMEDIATE"
}
```

---

## 6. Interventions & Outcomes

### `GET /api/v1/projects/{project_id}/interventions`
Retrieves evidence-backed mitigation actions and experiment proposals.

**Response (`200 OK`):**
```json
{
  "project_id": "aurora",
  "interventions": [
    {
      "id": "int_01",
      "project_id": "aurora",
      "recommendation": "Implement asynchronous ring-buffer decoupling for write ingestion.",
      "action_type": "ARCHITECTURE",
      "reason": "Prevents socket thread exhaustion by quarantining write bursts to non-blocking memory buffers.",
      "supporting_cases": ["hist_atlas_scaling"],
      "expected_effect": "Reduces P99 latency by 70% and eliminates thread lock contention.",
      "confidence": 0.92,
      "risk_of_inaction": "Cluster halt during upcoming high-throughput tenant onboarding.",
      "estimated_effort": "MEDIUM",
      "status": "PENDING"
    }
  ]
}
```

### `POST /api/v1/projects/{project_id}/outcomes`
Records real-world outcome verification after deploying an intervention, enabling continuous organizational learning.

**Request Body:**
```json
{
  "intervention_id": "int_01",
  "baseline_metric": "P99 4.8s",
  "current_metric": "P99 1.1s",
  "delta": "-77% latency reduction",
  "outcome_status": "RESOLVED",
  "learned_insights": [
    "Ring buffers eliminated socket blocking across all worker pods.",
    "Recommended for all high-concurrency stream ingestion architectures."
  ],
  "eligible_for_global_sanitization": true
}
```
