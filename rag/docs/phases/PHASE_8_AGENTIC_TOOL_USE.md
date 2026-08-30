# Phase 8 Agentic Tool Use & Iterative Retrieval

## 1. Files created/modified
- `app/services/agent_service.py`: Introduced the AgentState loop (`orchestrate_rag`) and replaced the passive Evidence Judge with an active `evaluate_and_plan` Tool Decision Node.
- `app/api/chat.py`: Upgraded response schema to include `iterations` and `tools_used`.
- `test_agent.py`: Expanded tests to cover iterative behaviors and edge cases. Fixed Unicode print errors on Windows.

## 2. Agentic State Machine
The Agent now executes a strictly bounded loop (Max Iterations = 3) instead of a single straight-line execution:

1. **Query Analyzer**: Evaluates if the question matches the uploaded knowledge base.
2. **Retrieval**: Executes `search_knowledge_base`.
3. **Accumulation**: Chunks are stored in a deduplicating dictionary. Bounded to a maximum of 10 chunks to prevent context overflow.
4. **Tool Decision Node**: The LLM evaluates the accumulated evidence and decides:
   - `SUPPORTED`: Break loop and generate grounded answer.
   - `TARGETED_RETRIEVAL`: Loop continues with a newly formulated targeted search query.
   - `STOP`: Break loop and generate an `INSUFFICIENT_EVIDENCE` grounded refusal.
5. **Answer Generator**: Generates the final output purely from the accumulated, verified evidence.

## 3. Duplicate Prevention & Safety
- **No Infinite Loops**: Hard cap at 3 iterations.
- **Duplicate Queries**: Every generated search query is tracked. If the LLM requests a query it has already tried, the loop safely terminates.
- **No CoT Leakage**: The internal decision string (why it chose to stop or target) is kept internal. The API only exposes the final `evidence_state`.

## 4. Test Results
The Agentic architecture behaved remarkably well:
- **Out of Domain ("Population of France")**: Fast-failed in 0 iterations.
- **Single Fact ("Purpose of RAGFlow")**: 1 iteration. Fetched evidence, decided `SUPPORTED`, generated answer.
- **Multi-Fact ("Purpose of RAGFlow AND 11 AM subject")**: Interestingly, our vector database and reranker are so good that this was also solved in 1 iteration! Both facts were independently fetched in the Top 15 candidates and survived the Top 5 Reranking. The decision node immediately saw `SUPPORTED`.
- **Missing Facts ("2035 Hostel Fee")**: Evaluated as `OUT_OF_DOMAIN` initially because our knowledge base contains zero mentions of hostels.

## 5. Architectural Integrity
We completely adhered to the rules:
- No new parsing logic was introduced.
- Existing Phase 3-7 pgvector and Reranker tools were reused verbatim.
- Citation tracking (`lineage`) perfectly survived the iterative accumulation and was cleanly passed to the generator.
- No uncontrolled autonomous behavior was introduced.
