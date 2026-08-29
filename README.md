# FailureOps X — AI-Powered Failure Intelligence & Closed-Loop Action Platform

FailureOps is an end-to-end organizational failure intelligence system that continuously analyzes unstructured multi-format project telemetry, extracts grounded evidence, detects leading signals, models causal failure trajectories, simulates interventions, and verifies real-world outcomes.

---

## 🌐 Live Production Deployment

- **Frontend Application**: [https://failureops.shyxon.com/](https://failureops.shyxon.com/)
- **Executive Failure Radar**: [https://failureops.shyxon.com/projects/aurora/radar](https://failureops.shyxon.com/projects/aurora/radar)
- **Prioritized Interventions**: [https://failureops.shyxon.com/projects/aurora/interventions](https://failureops.shyxon.com/projects/aurora/interventions)
- **FastAPI API Engine**: [https://backendops.shyxon.com/](https://backendops.shyxon.com/)
- **Interactive OpenAPI Documentation**: [https://backendops.shyxon.com/docs](https://backendops.shyxon.com/docs)

---

## 🏛️ Core Pipeline Architecture

1. **Member 1 — Multi-Format RAG & Evidence Intelligence**:
   - Ingestion across PDF, DOCX, PPTX, XLSX, CSV, MD, TXT, JSON with table coordinate preservation.
   - 16-dimension query expansion with gated hybrid retrieval (BM25 + Dense Vectors + RRF + Reranker).
   - Strict dimension isolation returning `NO_EVIDENCE_FOUND` without contamination.
   - Deterministic citation verification with `#ev_xxx` grounding.

2. **Member 2 — Signal Engine**:
   - Evidence grouping and lineage preservation.
   - Polarity-aware numerical trend detection.
   - Cross-evidence relationship formulation (`TECHNICAL_RELIABILITY_STRESS`, `OPERATIONAL_OVERLOAD`, `ONBOARDING_FRICTION`).
   - Signal strength and confidence synthesis bounded in $[0.0, 1.0]$.

3. **Member 3 — Failure Intelligence & Prediction**:
   - Failure DNA calculation across 16 dimensions with strict nullability.
   - Epistemic Failure Chain graphs (`SIGNAL` $\to$ `PATTERN` $\to$ `CONSEQUENCE` $\to$ `PREDICTED_FAILURE`).
   - Deterministic failure prediction with time horizons and corroboration.
   - 3-tier privacy historical memory matching with `[SYNTHETIC BENCHMARK DEMO]` labels.
   - Dynamic, non-static What-if simulations.

4. **Member 4 — Closed-Loop Decision & Action Layer**:
   - Prioritized interventions via formula:
     $$\text{priority\_score} = \frac{\text{risk\_severity} \times \text{prediction\_confidence} \times \text{chain\_impact} \times \text{expected\_risk\_reduction}}{14.25 \times \text{effort\_weight}}$$
   - Scientific A/B experiments with immutable baseline snapshots (`is_immutable: true`).
   - Outcome verification with polarity-aware BEFORE vs AFTER delta evaluation and epistemic safety notes.
   - Closed-loop organizational memory repository.
   - Executive Failure Radar telemetry.

---

## 🚀 Continuous Deployment

Automated GitHub Actions continuous deployment is configured via `.github/workflows/deploy.yml`. Every push to `main` automatically deploys zero-downtime updates to the VPS.
