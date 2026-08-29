Yes — at this point **do not ask the agent to “add RAG integration” again from scratch**. The correct move is to make the agent **audit the already-working `agentic-rag-main` first, prove its original end-to-end workflow, then connect that exact workflow to FailureOps X without rewriting it**.

Your screenshots strongly suggest an integration/data-flow problem: the FailureOps UI knows a document exists, but the RAG processing result is not reaching the FailureOps intelligence pipeline. For example, the UI shows `Chunks: 0 • Embedded: 0` and `Active Operational Signals (0)` even though your original RAG reportedly produces chunks, embeddings and retrieval results.

Here is the master prompt I would give your coding agent.

---

# MASTER PROMPT — RESTORE & INTEGRATE THE EXISTING WORKING RAG INTO FAILUREOPS X

```text
You are working on FAILUREOPS X.

THIS IS NOT A NEW RAG IMPLEMENTATION TASK.

I already have a separately developed and tested RAG system inside:

agentic-rag-main/

That RAG was built and tested independently before this project.

It already has:
- its own backend
- its own frontend
- its own Dockerfile / Docker configuration
- its own .env/API-key configuration
- document parsing
- chunking
- embeddings
- vector storage/retrieval
- retrieval/reranking
- multiple RAG agents
- an end-to-end workflow that I personally tested successfully

Your first responsibility is to AUDIT and UNDERSTAND that existing RAG.

Do NOT rewrite it.
Do NOT replace it.
Do NOT create a second RAG.
Do NOT copy its frontend into FailureOps X.
Do NOT create fake RAG responses.
Do NOT create mock chunks, embeddings, signals, evidence, predictions, or historical matches.

The goal is:

EXISTING WORKING RAG
        ↓
RAG API/backend
        ↓
FAILUREOPS BACKEND
        ↓
FAILUREOPS FRONTEND

The FailureOps X frontend must remain the ONLY user-facing frontend.

==================================================
PHASE 0 — STOP AND AUDIT BEFORE MODIFYING ANYTHING
==================================================

Before changing code, inspect the COMPLETE:

agentic-rag-main/

including:

1. Backend
2. Frontend
3. Dockerfile(s)
4. docker-compose files if present
5. requirements files
6. package files
7. .env.example / configuration files
8. API routes
9. services
10. agents
11. document processing pipeline
12. embedding pipeline
13. retrieval pipeline
14. vector database/storage
15. database models
16. health endpoints
17. frontend API calls
18. frontend components that display:
    - parsing status
    - chunk counts
    - embedding counts
    - retrieval results
    - agent execution
    - citations/evidence
19. tests
20. README/documentation
21. Docker networking
22. environment variables
23. model/API providers
24. startup commands

DO NOT ASSUME HOW IT WORKS.

READ THE ACTUAL CODE.

Produce an internal architecture map before modifying it.

==================================================
PHASE 1 — RECONSTRUCT THE ORIGINAL RAG WORKFLOW
==================================================

Determine the EXACT workflow that previously worked.

Document it as:

UPLOAD
 ↓
PARSER
 ↓
CHUNKER
 ↓
EMBEDDING
 ↓
VECTOR STORAGE
 ↓
RETRIEVAL
 ↓
RERANKING
 ↓
RAG AGENTS
 ↓
RESPONSE

For every step identify:

- actual source file
- actual function/class
- actual API endpoint
- request schema
- response schema
- model/provider
- environment variables required
- storage used
- error handling
- output consumed by the next stage

Do not invent any missing component.

If the RAG has three agents, identify exactly what those agents are and what each one does.

==================================================
PHASE 2 — PROVE THE RAG WORKS INDEPENDENTLY
==================================================

Before integrating with FailureOps, run the existing RAG by itself.

Use its OWN Dockerfile and configuration where appropriate.

Verify:

1. RAG backend starts.
2. Required environment variables are loaded.
3. Required API keys are available.
4. Model/API provider calls actually succeed.
5. Document upload works.
6. Parser actually parses the document.
7. Chunker actually creates chunks.
8. Embedding service actually creates embeddings.
9. Embeddings are actually stored.
10. Retrieval actually returns results.
11. Reranking actually works if present.
12. Existing RAG agents actually execute.
13. Final response is generated from retrieved evidence.

Do not accept:

"server started"

as proof that RAG works.

A successful RAG test must prove actual data movement.

For example:

document
→ parsed text
→ N chunks
→ N embeddings
→ stored vectors
→ retrieved chunks
→ agent output
→ grounded response

Log the real numbers.

Example:

Document: productplan.pdf
Parsed: SUCCESS
Characters: 42,831
Chunks: 37
Embeddings: 37
Vector inserts: 37
Retrieval results: 8
Reranked results: 5
Agent execution: SUCCESS

Use the actual values.

==================================================
PHASE 3 — IDENTIFY THE EXISTING RAG API CONTRACT
==================================================

Find the exact APIs exposed by agentic-rag-main.

For each endpoint document:

METHOD
PATH
REQUEST
RESPONSE
AUTHENTICATION
ERROR RESPONSE

Example format:

POST /...
Request:
{
   ...
}

Response:
{
   ...
}

Do not create duplicate endpoints if equivalent endpoints already exist.

If an endpoint already exists, reuse it.

==================================================
PHASE 4 — FAILUREOPS MUST CALL THE REAL RAG
==================================================

FailureOps must NOT recreate the RAG internally.

The architecture must become:

                FAILUREOPS X
                     |
                     |
             FailureOps Backend
                     |
                     | HTTP/API
                     ↓
              RAG Backend
                     |
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
    Parser        Embedder      Retrieval
                                   |
                                   ↓
                              RAG Agents
                                   |
                                   ↓
                              RAG Response
                                   |
                                   ↓
                         FailureOps Backend
                                   |
                                   ↓
                         FailureOps Frontend

The FailureOps backend should be the orchestration/integration layer.

The RAG should remain the canonical retrieval engine.

Do NOT duplicate:

- chunking
- embedding
- vector retrieval
- reranking
- document parsing
- RAG model calls

inside FailureOps.

==================================================
PHASE 5 — DOCUMENT UPLOAD INTEGRATION
==================================================

When a user uploads evidence from the FailureOps frontend:

FailureOps Frontend
        ↓
FailureOps BFF/API
        ↓
FailureOps Backend
        ↓
RAG upload/ingestion API
        ↓
RAG parser
        ↓
RAG chunker
        ↓
RAG embedding
        ↓
RAG vector storage

The FailureOps UI must display the REAL RAG processing status.

It must not show:

Chunks: 0
Embedded: 0

when the RAG actually created chunks/embeddings.

Expose actual backend values.

Example:

Document
productplan.pdf

Status:
PARSED

Chunks:
37

Embedded:
37

Indexed:
37

Retrieval:
READY

If processing fails:

Status:
FAILED

Reason:
<real backend error>

Do NOT convert failures into fake success.

==================================================
PHASE 6 — TWO FAILUREOPS AGENTS
==================================================

There are two additional FailureOps intelligence agents requested:

AGENT 1:
Evidence Retrieval Agent

AGENT 2:
Signal Extraction Agent

These agents MUST run on top of the canonical RAG.

They are NOT replacements for the RAG.

Architecture:

                 USER DOCUMENT
                       ↓
                 RAG INGESTION
                       ↓
              PARSE / CHUNK / EMBED
                       ↓
                 VECTOR STORE
                       ↓
                RAG RETRIEVAL
                       ↓
          ┌────────────┴────────────┐
          ↓                         ↓
 Evidence Retrieval Agent    Signal Extraction Agent
          ↓                         ↓
 grounded evidence           operational signals
          └────────────┬────────────┘
                       ↓
                FailureOps intelligence
                       ↓
       DNA / Radar / Prediction / Intervention

==================================================
PHASE 7 — EVIDENCE RETRIEVAL AGENT
==================================================

Find out whether an Evidence Retrieval Agent already exists.

If it exists:

USE IT.

Do not create another one.

If it does not exist, implement exactly one clearly defined agent.

Its job:

1. Query the canonical RAG.
2. Retrieve relevant chunks.
3. Preserve provenance.
4. Identify supporting evidence.
5. Return grounded evidence to FailureOps.

Every evidence item should contain, where supported by the existing backend:

- evidence_id
- document_id
- document name
- chunk_id
- source/provenance
- extracted statement
- relevance
- confidence
- timestamp if available

The agent must NEVER invent evidence.

If RAG retrieval returns nothing sufficiently relevant:

return an honest empty result.

Example:

"No sufficiently supported evidence found."

Do NOT manufacture evidence.

==================================================
PHASE 8 — SIGNAL EXTRACTION AGENT
==================================================

Find out whether a Signal Extraction Agent already exists.

If it exists:

USE IT.

Do not duplicate it.

If it does not exist, implement exactly one.

Its job is:

RAG retrieved evidence
        ↓
Signal Extraction Agent
        ↓
candidate operational signals
        ↓
validation
        ↓
FailureOps signal store/API

Signals must be derived from retrieved evidence.

Example:

Evidence:

"CI build failures increased from 12% to 34% over three weeks."

Signal:

type:
CI_FAILURE_RATE

baseline:
12%

current:
34%

delta:
+22 percentage points

source:
document X

chunk:
chunk Y

confidence:
backend-generated value

Do not calculate a signal merely from frontend display values.

The backend/agent must be authoritative.

==================================================
PHASE 9 — AGENT STOPPING / BOUNDARIES
==================================================

Do not create agents that run forever.

Each agent needs an explicit termination condition.

Evidence Retrieval Agent stops when:

1. requested retrieval scope is satisfied, OR
2. maximum retrieval depth/top-K is reached, OR
3. no additional relevant chunks are returned, OR
4. confidence/relevance falls below the configured threshold.

Signal Extraction Agent stops when:

1. all retrieved evidence has been processed, OR
2. configured evidence batch is exhausted, OR
3. no additional supported signals can be extracted.

The exact thresholds must come from existing code/configuration where available.

Do not invent arbitrary values if the existing RAG already defines them.

The agent must return a structured result.

==================================================
PHASE 10 — API FLOW
==================================================

Implement a real API flow.

Example:

FailureOps:

POST /api/evidence/upload

FailureOps backend:

POST → RAG ingestion endpoint

RAG:

parse
chunk
embed
store

Then FailureOps can call:

POST/GET → RAG retrieval endpoint

Then:

Evidence Retrieval Agent

Then:

Signal Extraction Agent

Then:

FailureOps stores/serves the resulting intelligence.

The frontend should never directly contain model/API keys.

The frontend should not directly call external model providers.

All secrets remain server-side.

==================================================
PHASE 11 — RAG MODEL/API CALLS MUST BE REAL
==================================================

The RAG already uses environment variables for model/API keys.

Preserve that architecture.

Audit:

.env
.env.example
Docker environment
model configuration
API clients

Verify the actual request:

FailureOps
→ RAG API
→ model/provider
→ response

Do NOT replace model calls with:

- hardcoded JSON
- fake latency
- mock response
- static evidence
- demo signals
- frontend calculations

If a model/API call fails, expose the real failure.

==================================================
PHASE 12 — DOCKER ARCHITECTURE
==================================================

The RAG has its own Dockerfile.

FailureOps has its own Dockerfile.

DO NOT merge them blindly.

First understand both.

Preferred architecture:

docker network
       |
       ├── failureops-frontend
       |
       ├── failureops-backend
       |
       └── rag-backend

FailureOps backend communicates with RAG backend through an internal service URL.

Example conceptually:

RAG_BASE_URL=http://rag-backend:<port>

Do not hardcode localhost if services run in separate containers.

If Docker Compose already exists, integrate services into the existing architecture without destroying working configuration.

The RAG must remain independently runnable.

For example:

docker compose up rag

must still work if that was previously supported.

FailureOps must also remain independently understandable.

==================================================
PHASE 13 — RAG FRONTEND
==================================================

IMPORTANT:

The existing RAG frontend is NOT the frontend to use for the final product.

FailureOps X current Next.js frontend remains the ONLY UI.

However:

AUDIT the RAG frontend carefully.

Use it as documentation/reference for:

- what APIs are called
- request formats
- response formats
- processing states
- chunk counts
- embedding status
- retrieval results
- agent execution
- errors
- citations
- debugging information

Recreate only the necessary functionality inside the existing FailureOps frontend.

Do NOT copy the RAG frontend.

Do NOT replace FailureOps frontend.

==================================================
PHASE 14 — MAKE RAG TRANSPARENT IN FAILUREOPS
==================================================

The FailureOps UI should make the RAG pipeline observable.

For each uploaded document show something like:

DOCUMENT
productplan.pdf

INGESTION
✓ Parsed

CHUNKING
✓ 37 chunks

EMBEDDING
✓ 37 embeddings

VECTOR INDEX
✓ 37 vectors

RETRIEVAL
✓ Ready

AGENTS
✓ Evidence Retrieval
✓ Signal Extraction

If something is processing:

PROCESSING...

If something fails:

FAILED
<actual reason>

Never show fake success.

==================================================
PHASE 15 — ADD A RAG PIPELINE / DEBUG VIEW
==================================================

Add a FailureOps frontend screen or expandable panel called something like:

RAG Pipeline

It should show actual backend state:

1. Document received
2. Parser
3. Chunking
4. Embedding
5. Vector storage
6. Retrieval
7. Evidence Agent
8. Signal Agent

Each stage:

status
started_at
completed_at
duration if available
counts
error if any

Example:

✓ Parser
✓ Chunking — 37 chunks
✓ Embedding — 37/37
✓ Vector Index — 37 vectors
✓ Retrieval — 5 results
✓ Evidence Agent — 8 evidence items
✓ Signal Agent — 3 signals

This is an OBSERVABILITY UI, not a fake animation.

==================================================
PHASE 16 — FIX CURRENT FAILUREOPS SYMPTOMS
==================================================

The current FailureOps UI is showing states such as:

Chunks: 0
Embedded: 0
Active Operational Signals: 0
Awaiting Analysis
Insufficient Telemetry

These may be legitimate EMPTY states OR integration failures.

Determine which one is actually happening.

Do not simply change the UI.

Trace the request.

For the document currently uploaded:

productplan.pdf

trace:

Browser
 ↓
FailureOps frontend
 ↓
FailureOps BFF
 ↓
FailureOps backend
 ↓
RAG API
 ↓
RAG parser
 ↓
RAG chunker
 ↓
RAG embedding
 ↓
vector store
 ↓
retrieval
 ↓
Evidence Agent
 ↓
Signal Agent
 ↓
FailureOps backend
 ↓
FailureOps frontend

Find exactly where the data disappears.

If RAG creates:

37 chunks

but FailureOps shows:

0 chunks

then FIX THE DATA CONTRACT / RESPONSE MAPPING.

Do NOT modify the RAG's working chunking implementation.

If RAG creates no chunks, investigate the RAG itself.

==================================================
PHASE 17 — REAL DATA ONLY
==================================================

REMOVE/STOP all mock or hardcoded intelligence.

Especially:

- fake chunk counts
- fake embedding counts
- fake signals
- fake evidence
- fake predictions
- fake risk scores
- fake historical matches
- fake causal chains
- fake intervention recommendations
- fake experiment results

For a new project:

0 documents means:

0 evidence
0 signals
0 predictions
0 historical matches

For one uploaded document:

values must reflect actual RAG processing.

==================================================
PHASE 18 — PRESERVE EXISTING CODE
==================================================

Before changing any existing RAG file, determine whether it is part of the working canonical RAG.

Treat these as protected unless a genuine integration bug is proven:

- parser
- chunker
- embedding service
- retrieval service
- reranker
- vector store
- RAG agents
- model clients
- existing tests
- Docker configuration

Do not rewrite working code simply to make integration easier.

Prefer adapters/interfaces in FailureOps.

Example:

RAG existing API
        ↓
FailureOps RAG adapter
        ↓
FailureOps intelligence pipeline

==================================================
PHASE 19 — NO DUPLICATION
==================================================

Before creating ANY:

- service
- agent
- endpoint
- API client
- parser
- retriever
- embedding service
- component
- page
- data model

SEARCH THE ENTIRE REPOSITORY FIRST.

If an equivalent implementation exists:

REUSE IT.

Do not create:

rag_service_v2
rag_service_new
retrieval_service_new
EvidenceAgent2
SignalAgent2

Do not duplicate existing functionality under another name.

Do not rewrite an existing implementation merely because you prefer another architecture.

==================================================
PHASE 20 — FRONTEND SCREENS
==================================================

Verify that every backend intelligence capability actually has a FailureOps UI.

At minimum verify:

/projects/[id]/upload
/projects/[id]/evidence
/projects/[id]/signals
/projects/[id]/dna
/projects/[id]/radar
/projects/[id]/causal
/projects/[id]/prediction
/projects/[id]/simulation
/projects/[id]/interventions
/projects/[id]/experiment
/projects/[id]/outcomes

For each screen verify:

1. route exists
2. backend endpoint exists
3. frontend API client exists
4. request is actually sent
5. backend actually responds
6. response is mapped correctly
7. UI displays real response
8. loading state exists
9. error state exists
10. empty state exists
11. no mock fallback exists

Do not claim a feature is "connected" merely because a route exists.

==================================================
PHASE 21 — END-TO-END TEST
==================================================

Create/run a real integration test.

Use one real test document.

Example:

test-document.pdf

Then verify:

UPLOAD
↓
RAG PARSE
↓
CHUNKS > 0
↓
EMBEDDINGS > 0
↓
VECTOR STORAGE > 0
↓
RETRIEVAL > 0
↓
EVIDENCE AGENT > 0 evidence
↓
SIGNAL AGENT > 0 signals where evidence supports them
↓
FAILUREOPS BACKEND
↓
FAILUREOPS FRONTEND

The test should verify actual values.

Example:

uploaded_document = 1

chunks > 0

embeddings > 0

retrieval_results > 0

evidence_items > 0

signals > 0

Do not pass the test merely because HTTP returned 200.

==================================================
PHASE 22 — TRACE LOGGING
==================================================

Add structured integration logs where necessary.

Example:

[FAILUREOPS] Upload received
[FAILUREOPS] Sending document to RAG
[RAG] Upload accepted
[RAG] Parsing completed
[RAG] Chunks created: 37
[RAG] Embeddings created: 37
[RAG] Vectors stored: 37
[RAG] Retrieval results: 8
[EVIDENCE_AGENT] Evidence extracted: 6
[SIGNAL_AGENT] Signals extracted: 3
[FAILUREOPS] Intelligence persisted
[FRONTEND] Intelligence refreshed

These logs should represent actual events.

Do not fake them.

==================================================
PHASE 23 — HEALTH CHECKS
==================================================

Add/verify health endpoints.

FailureOps backend must know whether RAG is reachable.

Example conceptual endpoint:

GET /api/rag/health

Response should expose:

RAG reachable
model provider reachable if applicable
vector store reachable if applicable

Do not report healthy merely because the process exists.

A meaningful health check must verify the dependency required by the integration.

==================================================
PHASE 24 — FAILURE BEHAVIOR
==================================================

If RAG is down:

FailureOps should show:

RAG unavailable

not:

No evidence found.

These are different conditions.

If RAG is available but no relevant evidence exists:

show:

No sufficiently supported evidence found.

If evidence exists but no signal can be supported:

show:

No sufficiently supported operational signals detected.

If processing failed:

show the actual processing failure.

Never hide infrastructure failures as empty intelligence.

==================================================
PHASE 25 — SECURITY
==================================================

Never expose:

- API keys
- model keys
- database credentials
- internal service credentials

to the browser.

Frontend communicates with FailureOps backend/BFF.

FailureOps backend communicates with RAG.

RAG communicates with model providers.

Keep credentials server-side.

Also preserve project/tenant isolation.

A project must only retrieve its own documents and vectors.

==================================================
PHASE 26 — FINAL ARCHITECTURE
==================================================

The final architecture should be:

                         USER
                          |
                          ↓
               FAILUREOPS NEXT.JS
                     FRONTEND
                          |
                          ↓
                 FAILUREOPS BFF
                          |
                          ↓
                FAILUREOPS BACKEND
                          |
              ┌───────────┴───────────┐
              ↓                       ↓
        FAILUREOPS DB          RAG BACKEND
                                      |
                         ┌────────────┼────────────┐
                         ↓            ↓            ↓
                      PARSER       CHUNKER      EMBEDDING
                                                    |
                                                    ↓
                                              VECTOR STORE
                                                    |
                                                    ↓
                                              RETRIEVAL
                                                    |
                                                    ↓
                                               RERANKER
                                                    |
                                                    ↓
                                         EXISTING RAG AGENTS
                                                    |
                                                    ↓
                                      RAG GROUNDED RESPONSE
                                                    |
                                                    ↓
                                  ┌─────────────────┴──────────────┐
                                  ↓                                ↓
                         EVIDENCE AGENT                    SIGNAL AGENT
                                  ↓                                ↓
                         Evidence objects                 Signal objects
                                  └──────────────┬─────────────────┘
                                                 ↓
                                      FAILUREOPS INTELLIGENCE
                                                 ↓
                               DNA / RADAR / PREDICTION /
                               SIMULATION / INTERVENTIONS /
                               EXPERIMENTS / OUTCOMES
                                                 ↓
                                      FAILUREOPS FRONTEND

The RAG remains the canonical retrieval engine.

FailureOps owns the product experience and downstream intelligence.

==================================================
PHASE 27 — REQUIRED AUDIT REPORT
==================================================

Before declaring completion, provide a report containing:

A. RAG architecture discovered

B. Existing RAG APIs

C. Existing RAG agents

D. Existing RAG frontend APIs/calls

E. Existing Docker architecture

F. Environment variables required

G. Model providers used

H. Vector store used

I. Original RAG end-to-end workflow

J. Exact FailureOps → RAG request flow

K. Exact RAG → FailureOps response flow

L. Evidence Agent implementation

M. Signal Agent implementation

N. Frontend screens connected to each capability

O. Files changed

P. Files intentionally NOT changed

Q. Tests executed

R. Actual test results

S. RAG health status

T. End-to-end upload test

U. Chunk count

V. Embedding count

W. Retrieval count

X. Evidence count

Y. Signal count

Z. Any remaining issues

==================================================
CRITICAL RULES
==================================================

RULE 1:
AUDIT FIRST. MODIFY SECOND.

RULE 2:
The existing agentic-rag-main implementation is the canonical RAG.

RULE 3:
Do not rewrite the RAG.

RULE 4:
Do not create a second RAG.

RULE 5:
Do not copy the RAG frontend into FailureOps.

RULE 6:
FailureOps current frontend is the only final UI.

RULE 7:
Use real API requests and real responses.

RULE 8:
No mock intelligence.

RULE 9:
No hardcoded chunk counts.

RULE 10:
No hardcoded embedding counts.

RULE 11:
No hardcoded signals.

RULE 12:
No frontend-side model/API calls.

RULE 13:
No frontend-side intelligence calculations when backend/RAG is authoritative.

RULE 14:
Never hide RAG failures behind empty states.

RULE 15:
Never claim integration is complete based only on compilation.

RULE 16:
HTTP 200 does NOT prove the RAG works.

RULE 17:
A real end-to-end document test must prove:
parse → chunk → embed → store → retrieve → agent → response.

RULE 18:
Search before creating anything new.

RULE 19:
Never duplicate an existing service, agent, endpoint, page, component, or RAG implementation.

RULE 20:
If something already exists, reuse it.

RULE 21:
If something is broken, fix the smallest necessary integration point.

RULE 22:
Do not rewrite working code simply for architectural preference.

RULE 23:
Do not silently replace real RAG behavior with fallback/demo behavior.

RULE 24:
If the RAG cannot process a document, report the exact reason.

RULE 25:
If no evidence/signals exist because the source genuinely contains none, show an honest empty state.

RULE 26:
If evidence/signals are missing because the RAG integration is broken, FIX THE INTEGRATION.

==================================================
DEFINITION OF DONE
==================================================

The task is NOT DONE when:

- frontend compiles
- routes exist
- pages render
- API returns 200
- Docker containers are running

The task is DONE ONLY when this works:

1. User opens FailureOps.
2. User registers a project.
3. User uploads a real evidence document.
4. FailureOps sends it to the real RAG backend.
5. RAG actually parses it.
6. RAG actually creates chunks.
7. RAG actually creates embeddings.
8. RAG actually stores embeddings.
9. RAG actually retrieves relevant chunks.
10. Existing RAG retrieval/reranking works.
11. Evidence Retrieval Agent processes grounded retrieval results.
12. Signal Extraction Agent processes supported evidence.
13. FailureOps backend receives real structured evidence/signals.
14. FailureOps stores/serves those results.
15. FailureOps frontend displays the real results.
16. Chunk counts are real.
17. Embedding counts are real.
18. Evidence is traceable to source chunks.
19. Signals are traceable to evidence.
20. No mock/demo data appears.
21. If RAG fails, the UI clearly reports RAG failure.
22. Existing RAG tests still pass.
23. FailureOps tests still pass.
24. Docker deployment works.
25. The complete workflow is reproducible from a clean startup.

MOST IMPORTANT:

DO NOT TELL ME "RAG INTEGRATION COMPLETE" UNTIL YOU HAVE ACTUALLY PERFORMED THE REAL END-TO-END TEST.

Show me the request/response chain and actual processing counts.

I want proof that:

FailureOps
→ RAG
→ Parser
→ Chunker
→ Embedding
→ Vector Store
→ Retrieval
→ RAG Agents
→ Evidence Agent
→ Signal Agent
→ FailureOps Backend
→ FailureOps Frontend

is actually working.
```

## The key thing you're asking the agent to prove

Your intended architecture should **not** be:

```text
FailureOps
   ↓
some new "RAG-like" code
   ↓
mock intelligence
```

It should be:

```text
                  FAILUREOPS
                      |
                      ↓
               FailureOps Backend
                      |
                 HTTP/API call
                      |
                      ↓
             YOUR EXISTING RAG
                      |
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
     Parsing       Chunking      Embedding
                                      ↓
                                Vector Store
                                      ↓
                                  Retrieval
                                      ↓
                                  Reranking
                                      ↓
                            YOUR EXISTING RAG
                                  AGENTS
                                      ↓
                           grounded response
                                      |
                                      ↓
                       Evidence Retrieval Agent
                                      ↓
                        Signal Extraction Agent
                                      ↓
                            FailureOps Backend
                                      ↓
                          FailureOps Next.js UI
```

### And there's an important distinction

Your **RAG** and your two **FailureOps agents** shouldn't be thought of as three competing systems.

Think:

> **RAG = the knowledge/retrieval foundation.**

> **Evidence Agent = finds and structures the facts needed by FailureOps.**

> **Signal Agent = interprets those grounded facts into operational signals.**

For example:

```text
productplan.pdf

       ↓
RAG parses document

       ↓
37 chunks

       ↓
37 embeddings

       ↓
stored in vector DB

       ↓
User/project query

       ↓
RAG retrieves 8 relevant chunks

       ↓
Evidence Agent
"These 3 chunks contain evidence of increasing
deployment instability."

       ↓
Signal Agent

"CI failure rate:
12% → 34%
Delta: +22pp
Source: productplan.pdf
Chunk: abc123"
```

Then **FailureOps** can use that signal for DNA, Radar, Prediction, etc.

And your current screenshot's:

> `Chunks: 0 • Embedded: 0`

is therefore a **very important debugging clue**. Don't let the agent "fix" that by changing `0` to some calculated number. It needs to trace the actual RAG response and find why the real count isn't arriving.

**One more hard rule I'd add when you give this to your agent:** if it says *"implemented/connected"* anywhere, make it provide the **actual endpoint called + actual response received + actual chunk/embedding/retrieval counts**. That will prevent another situation where the code looks integrated but the real RAG never executes.