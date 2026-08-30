# Intelligence Fixture Contract Specification

## Overview

This document specifies the integration contract between the upstream intelligence layer (LangGraph / RAG / Multi-Agent) and the FailureOps downstream engines (Failure DNA, Causal Chains, Predictions, Historical Memory, What-if Simulations, Interventions, Experiments, Outcomes, and Radar).

The temporary **Fixture Provider** allows the FailureOps backend and frontend teams to test and run all downstream engines with realistic, internally consistent data while the external LangGraph service is in development.

---

## 1. Architecture Flow

### Future / Real Integration
```text
Existing RAG
    ↓
LangGraph Service
    ↓
Evidence Agent (Multi-dimension Extraction & Citation Validation)
    ↓
Signal Agent (Grouping, Trends, Relationships, Synthesis)
    ↓
Structured Intelligence Result (EvidencePacket + SignalPacket)
    ↓
FailureOps Backend (Failure DNA → Causal Chain → Prediction → Memory → Simulation → Interventions → Radar)
```

### Current Temporary Fixture Integration
```text
FixtureProvider (Configured via INTELLIGENCE_SOURCE=fixture)
    ↓
Structured Intelligence Result (EvidencePacket + SignalPacket, is_simulated=true)
    ↓
FailureOps Backend (REAL Failure DNA → REAL Causal Chain → REAL Prediction → REAL Memory → REAL Simulation → REAL Interventions → REAL Radar)
```

---

## 2. Upstream Contract: `EvidencePacket` Schema

Both real LangGraph and the Fixture Provider output the canonical `EvidencePacket`:

```json
{
  "project_id": "string",
  "analysis_id": "string",
  "organization_id": "string",
  "generated_at": "ISO-8601 string",
  "evidence": [
    {
      "id": "ev_fix_001",
      "category": "QUALITY",
      "evidence_type": "METRIC",
      "statement": "Unresolved P1/P2 defect backlog increased from 25 to 33 issues.",
      "normalized_value": {
        "metric": "unresolved_bugs",
        "before": 25.0,
        "after": 33.0,
        "unit": "count",
        "direction": "INCREASE"
      },
      "time_period": {
        "start": "2026-Q2",
        "end": "2026-Q3"
      },
      "source": {
        "document_id": "doc_fixture_eng_telemetry",
        "document_name": "FIXTURE: Engineering & Release Telemetry",
        "location_type": "SECTION",
        "location_value": "Issue Tracker & Defect Backlog"
      },
      "supporting_sources": [],
      "supporting_chunk_ids": ["fixture://engineering-risk/ev-001"],
      "evidence_confidence": 0.94,
      "verification_status": "VERIFIED",
      "privacy": {
        "visibility": "PRIVATE",
        "global_learning_allowed": false
      }
    }
  ],
  "conflicts": [],
  "coverage": {
    "QUALITY": "HIGH",
    "TECHNICAL": "HIGH",
    "TEAM": "HIGH",
    "CUSTOMER": "MEDIUM"
  },
  "metrics": {
    "total_documents_analyzed": 1,
    "total_chunks_searched": 5,
    "total_evidence_extracted": 5,
    "verified_evidence_count": 5,
    "rejected_evidence_count": 0,
    "conflicts_count": 0,
    "processing_time_seconds": 0.05,
    "is_simulated": true,
    "source": "INTELLIGENCE_FIXTURE",
    "fixture_version": "1.0"
  }
}
```

---

## 3. Upstream Contract: `SignalPacket` Schema

Both real LangGraph and the Fixture Provider output the canonical `SignalPacket`:

```json
{
  "project_id": "string",
  "analysis_id": "string",
  "organization_id": "string",
  "generated_at": "ISO-8601 string",
  "signals": [
    {
      "signal_id": "sig_fix_001",
      "project_id": "string",
      "analysis_id": "string",
      "organization_id": "string",
      "name": "Defect Compounding & Bug Backlog",
      "category": "QUALITY",
      "signal_type": "TREND",
      "polarity": "NEGATIVE",
      "status": "WORSENING",
      "severity": "HIGH",
      "summary": "Backlog of open high-severity bugs grew by 32.0% during the current sprint cycle.",
      "metric_change": "+32.0% (25 -> 33 count)",
      "signal_strength": 0.88,
      "signal_confidence": 0.94,
      "historical_prevalence": 85,
      "supporting_evidence_ids": ["ev_fix_001"],
      "supporting_relationship_ids": ["rel_fix_tech_stress"]
    }
  ],
  "summary": {
    "total_signals": 5,
    "positive_count": 0,
    "negative_count": 5,
    "neutral_count": 0,
    "mixed_count": 0,
    "critical_count": 1,
    "high_count": 3,
    "medium_count": 1,
    "low_count": 0,
    "health_score": 32.0
  }
}
```

---

## 4. Downstream Engine Invariant

**CRITICAL RULE**: Downstream FailureOps engines are **NEVER MOCKED**.

| Downstream Engine | Input Contract | Real Execution Verified |
| :--- | :--- | :--- |
| **Failure DNA** | `calculate_failure_dna(signal_packet, evidence_packet)` | Computes 8-axis risk scores, dominant archetypes, and health status from signals. |
| **Failure Chain & Prediction** | `generate_failure_chain_and_prediction(signal_packet, dna_packet)` | Generates causal trajectory nodes, zero-slack bottlenecks, and time horizons. |
| **Historical Memory** | `search_historical_failure_cases(...)` | Vector/similarity matching against organizational memory cases with privacy scoping. |
| **What-if Simulation** | `run_what_if_simulations(...)` | Evaluates counterfactuals (e.g. +30% capacity, pipeline freeze). |
| **Interventions** | `generate_intervention_plan(...)` | Mathematical priority scoring formula `(severity * conf * impact * reduction) / (cost * effort)`. |
| **Experiments & Outcomes** | `generate_initial_experiments_from_plan(...)` | Generates structured A/B verification experiments with success criteria. |
| **Executive Radar** | `synthesize_failure_radar_snapshot(...)` | Aggregates project mortality, velocity drag, and multi-agent health snapshot. |

---

## 5. Environment & Feature Flags

| Flag | Values | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `INTELLIGENCE_SOURCE` | `langgraph` \| `fixture` | `langgraph` | Declares active upstream intelligence provider. |
| `INTELLIGENCE_FIXTURE_ENABLED` | `true` \| `false` | `false` (Prod) / `true` (Dev) | Protects test endpoints from unauthorized invocation. |
