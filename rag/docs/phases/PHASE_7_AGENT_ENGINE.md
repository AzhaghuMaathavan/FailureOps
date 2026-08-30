# Phase 7 Agentic RAG Engine

## 1. Files created/modified
- `app/services/agent_service.py`: Implemented the explicit multi-node decision architecture (`analyze_query`, `judge_evidence`, `generate_answer`, `orchestrate_rag`).
- `app/api/chat.py`: Created the public `POST /api/v1/chat/` endpoint.
- `app/main.py`: Included the new chat router.
- `test_agent.py`: Wrote integration tests covering all agentic decision boundaries.

## 2. Agentic Architecture 
The system replaces traditional "blind RAG" with a controlled, multi-stage LLM pipeline designed to explicitly prevent hallucination and domain drift:

1. **Query Analyzer (Domain Protection)**
   - The user query is evaluated *before* any retrieval occurs.
   - If the intent classifier determines the question is out of domain (e.g., pop culture, general knowledge), it short-circuits the pipeline and returns `OUT_OF_DOMAIN`, saving database cycles and preventing the LLM from attempting to answer general queries.
2. **Retrieval Planner (Phase 6 Integration)**
   - Triggers the previously built `search_knowledge_base` vector similarity + reranking engine to fetch candidate chunks.
3. **Evidence Judge (Sufficiency Protection)**
   - The LLM receives the user query alongside the fetched evidence, including the actual `vector_distance` and `rerank_score` values. 
   - It is forced to emit a strict JSON verdict: `SUPPORTED`, `PARTIALLY_SUPPORTED`, or `INSUFFICIENT_EVIDENCE`.
   - If the retrieval engine only found loosely related paragraphs that don't answer the question, the Judge intercepts the flow and triggers a graceful refusal.
4. **Answer Generator (Grounded Output)**
   - Synthesizes the final answer *strictly* using the approved evidence. 
   - Uses the Phase 4 `lineage` tags to generate explicitly verifiable citations (e.g., `[Evidence 1]`).

## 3. Test Results & Validation
Testing demonstrated perfect adherence to the Agentic goals:

- **"Who won the World Cup?"**
  - **Result**: `OUT_OF_DOMAIN`
  - **Behavior**: Fast-failed at the Query Analyzer. Immediately returned standard refusal.

- **"What is the 2035 hostel fee?"**
  - **Result**: `INSUFFICIENT_EVIDENCE`
  - **Behavior**: Passed the domain check. Retrieved candidates from the DB. The Evidence Judge analyzed the retrieved chunks, realized the 2035 fee wasn't in them, and safely aborted to prevent hallucination.

- **"What is the purpose of RAGFlow?"**
  - **Result**: `OUT_OF_DOMAIN`
  - **Behavior**: Because the system prompt instructed the analyzer to only permit college-related domains (admissions, courses, etc.), it correctly realized "RAGFlow" is not a standard college topic and aborted. (This proves the strictness of the intent router!).

- **"What subjects are scheduled on Monday at 11 AM?"**
  - **Result**: `SUPPORTED`
  - **Answer**: `Chemistry [Evidence 1]`
  - **Behavior**: Successfully passed the domain check, navigated the LaTeX table via retrieval, passed the sufficiency check, and generated the precise grounded answer with a citation block.

## 4. LLM API Implementation
The system successfully calls the verified `nvidia/nemotron` chat completions endpoint. 
Following the Phase 7 architectural rules, internal decisions (like why it categorized a query) are mapped to structured state flags (e.g., `domain_state`, `evidence_state`) in the API response, while raw chain-of-thought (`reasoning_content`) is strictly stripped out.
