# FailureOps X — Autonomous Intelligence Agents Specification

This document defines the purpose, inputs, outputs, operational boundaries, and anti-patterns for each agent in the FailureOps X intelligence pipeline.

---

## 1. Evidence Agent

- **Purpose**: Parses retrieved document chunks from the RAG layer and extracts structured, citation-backed empirical evidence.
- **Input**:
  - `candidates: List[ChunkCandidate]` (Retrieved text chunks with page, section, file, and similarity scores)
  - `privacy_scope: PrivacyScope`
- **Output**:
  - `EvidencePacket` (Array of typed `EvidenceItem` records with facts, quotes, metrics, anomalies, confidence, and line/page lineage)
- **Dependencies**: RAG Retrieval Service, PyMuPDF / Docling parser output, LLM entity extractor.
- **What it must NOT do**:
  - Must NOT guess or invent facts not grounded in source text.
  - Must NOT assign project-wide risk scores.
  - Must NOT recommend software fixes or interventions.

---

## 2. Signal Agent

- **Purpose**: Synthesizes weak failure signals, anomaly vectors, metric deviations, and trajectory drifts from extracted evidence items.
- **Input**:
  - `evidence_packet: EvidencePacket`
  - `baseline_metrics: Optional[Dict]`
- **Output**:
  - `SignalPacket` (Categorized signals with severity: `LOW | MEDIUM | HIGH | CRITICAL`, direction, trend, and supporting evidence IDs)
- **Dependencies**: Evidence Agent output, deterministic metric deviation calculators.
- **What it must NOT do**:
  - Must NOT output signals without referencing at least one supporting `evidence_id`.
  - Must NOT perform document parsing directly.
  - Must NOT output fake hallucinations when no anomalies exist.

---

## 3. Pattern & Causal Chain Agent

- **Purpose**: Traverses relationships between signals to discover causal chains, dependency loops, and systemic failure archetypes.
- **Input**:
  - `signal_packet: SignalPacket`
- **Output**:
  - `PatternPacket` (Identified failure chains, root triggers, intermediate amplifiers, terminal failure nodes, and compound risk scores)
- **Dependencies**: Signal Agent output, Causal DAG graph engine.
- **What it must NOT do**:
  - Must NOT invent arbitrary edges between unrelated signals.
  - Must NOT execute external database mutations.

---

## 4. Failure DNA Agent

- **Purpose**: Quantifies organizational vulnerability across 6 standard dimensions:
  1. Technical
  2. Operational
  3. Adoption
  4. Execution
  5. Financial
  6. Customer
- **Input**:
  - `signal_packet: SignalPacket`
  - `pattern_packet: PatternPacket`
- **Output**:
  - `FailureDNA` (Scores 0-100 per dimension, severity classification, primary drivers, evidence confidence, dominant archetype)
- **Dependencies**: Signal Agent, Pattern Agent.
- **What it must NOT do**:
  - Must NOT output arbitrary hardcoded dimension scores.
  - Must NOT ignore dimensional evidence when computing weighted aggregate risk.

---

## 5. Truth & Assumption Agent

- **Purpose**: Cross-examines product roadmaps, executive claims, and design assumptions against ground-truth operational evidence.
- **Input**:
  - `assumptions: List[AssumptionClaim]`
  - `evidence_packet: EvidencePacket`
- **Output**:
  - `TruthAssessment` (Status: `VERIFIED | CHALLENGED | UNSUPPORTED | REFUTED`, supporting/contradicting evidence links, integrity score)
- **Dependencies**: Evidence Agent, LLM logic verification engine.
- **What it must NOT do**:
  - Must NOT mark an assumption as verified without explicit empirical evidence.
  - Must NOT alter source evidence.

---

## 6. Prediction Agent (Failure Radar)

- **Purpose**: Projects risk velocity along a time horizon to forecast the most probable next catastrophic failure point.
- **Input**:
  - `failure_dna: FailureDNA`
  - `signals: SignalPacket`
  - `historical_matches: List[HistoricalMatch]`
- **Output**:
  - `RadarResponse` (Predicted failure event, probability 0-100%, timeframe, urgency, historical parallels, explanation)
- **Dependencies**: Failure DNA, Historical Memory Engine.
- **What it must NOT do**:
  - Must NOT predict failure without linking contributing signals and historical precedents.
  - Must NOT output ungrounded panic alerts.

---

## 7. Intervention & Experiment Agent

- **Purpose**: Synthesizes high-leverage mitigation strategies and controlled experiment designs (A/B tests, architectural rollbacks, circuit breakers) backed by historical outcomes.
- **Input**:
  - `radar: RadarResponse`
  - `failure_dna: FailureDNA`
  - `historical_interventions: List[Dict]`
- **Output**:
  - `InterventionResponse` (Actionable steps, expected metric delta, confidence, risk of inaction, experiment design)
- **Dependencies**: Prediction Agent, Historical Memory Engine.
- **What it must NOT do**:
  - Must NOT recommend generic, non-actionable advice (e.g. "write cleaner code").
  - Must NOT execute interventions automatically without human executive sign-off.
