# Phase 9: Evaluation & Reliability Framework

## 1. Golden Evaluation Dataset
We established a static offline evaluation dataset (`tests/evaluation_dataset.json`) containing deterministic expectations:
1. `eval_001`: Direct factual (RAGFlow purpose)
2. `eval_002`: Table layout extraction (Monday 11 AM subject)
3. `eval_003`: Multi-fact compound query
4. `eval_004`: Unsupported future question (Hostel fee in 2035)
5. `eval_005`: Out-of-domain general knowledge (Population of France)

Each case maps directly to expected `chunk_id` and `document_id` arrays to verify deterministic retrieval boundaries, as well as `expected_domain_state` and `expected_evidence_state`.

## 2. Methodology

The framework (`tests/test_evaluation.py`) measures three completely decoupled subsystems:

### A. Retrieval Quality (Deterministic)
Before the agent loop executes, the exact `search_knowledge_base()` boundary is probed to measure:
- **Recall@15**: Do the target `chunk_ids` survive the raw `pgvector` Cosine Distance retrieval?
- **Recall@5**: Do the target `chunk_ids` survive the NVIDIA Mistral Reranker?

### B. Agent Routing (Deterministic)
The orchestrator's state transitions are measured against expected states:
- `OUT_OF_DOMAIN` / `IN_DOMAIN`
- `SUPPORTED` / `PARTIALLY_SUPPORTED` / `INSUFFICIENT_EVIDENCE` / `NONE`
- Maximum 3 iterations constraint and Duplicate-query loops.

### C. Generation Quality (LLM-as-a-Judge)
An offline evaluator instance evaluates the generated string offline against expected facts.
- **Correctness**: Does it contain the expected facts?
- **Groundedness**: Does it avoid hallucinating information beyond the retrieved chunks?

## 3. Measured Results

```
========================================
METRICS REPORT
========================================
Retrieval Recall@15 : 3/3 (100.0%)
Rerank Recall@5     : 3/3 (100.0%)
Domain Routing      : 3/5 (60.0%)
Evidence Decision   : 3/5 (60.0%)
Answer Correctness  : 2/2 (100.0%)
Answer Groundedness : 2/2 (100.0%)
```

### Analysis of Failures:
The drop to **60.0%** in Domain Routing and Evidence Decision stems entirely from a hyper-conservative `Domain Analyzer`. 
- `eval_002` ("What is scheduled on Monday at 11 AM?") was rejected as `OUT_OF_DOMAIN`.
- `eval_004` ("What is the hostel fee in 2035?") was rejected as `OUT_OF_DOMAIN`.

Because our analyzer prompt restricts questions to "the contents of our uploaded knowledge base", queries that lack explicit context (like the word "College" or "RAGFlow") are mistakenly treated as general unanswerable chatter, completely bypassing retrieval. 

*We explicitly did not patch this failure in Phase 9, as the goal was objective measurement of the existing Phase 8 pipeline.*

## 4. Latency & Observability

We introduced tight `time.time()` latency bounding across the pipeline. A typical supported query execution (`eval_001`) yielded:

| Component | Latency |
| :--- | :--- |
| **Vector Retrieval (pgvector)** | 0.01s |
| **NVIDIA Reranking** | 0.57s |
| **LLM Generation** | 2.92s |
| **Total Orchestration** | 10.17s |

*(Note: The overhead originates heavily from multiple LLM calls - Analyzer, Tool Decision Node, Generation - which summate quickly.)*

## 5. Security & Rule Compliance
- We did **not** inject BM25 or Hybrid Search just to improve numbers.
- We did **not** secretly adjust the Agent Analyzer prompt to fix the failures.
- We did **not** leak `reasoning_content` to the client.
- We did **not** use the LLM-as-a-judge in production flows.
