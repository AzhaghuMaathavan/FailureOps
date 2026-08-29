Yes — the key thing you need to tell the agent is:

> **Do NOT replace the current FailureOps X frontend with the RAG project's old frontend.**
> The **RAG backend/engine is the intelligence layer**, while your **current FailureOps X frontend remains the only UI**.

Here is the master prompt you can give your agent:

```md
# FAILUREOPS X — RAG BACKEND INTEGRATION + CURRENT FRONTEND PRESERVATION
## MASTER ENGINEERING PROMPT

You are working on an existing FailureOps X application.

IMPORTANT CONTEXT:

I ALREADY HAD A WORKING RAG SYSTEM BEFORE.

The original RAG backend/engine was working correctly, including:
- document ingestion
- file parsing
- chunking
- embeddings
- vector storage
- hybrid retrieval
- reranking
- grounded retrieval
- evidence generation
- citations/provenance
- RAG-based reasoning

Later, additional FailureOps X layers/features were added around it.

The current problem is NOT that I want a new RAG implementation.

The problem is that I need the ORIGINAL WORKING RAG BACKEND/ENGINE to operate correctly with the CURRENT FailureOps X FRONTEND.

============================================================
# 1. ABSOLUTE ARCHITECTURE RULE
============================================================

DO NOT replace the current FailureOps X frontend.

DO NOT bring back the old RAG frontend.

DO NOT copy the old RAG UI into this project.

DO NOT create a second frontend for the RAG.

DO NOT route users to the old RAG frontend.

The architecture MUST be:

    CURRENT FAILUREOPS X FRONTEND
                 |
                 | API requests
                 v
        CURRENT BFF / API PROXY
                 |
                 v
        FAILUREOPS X BACKEND
                 |
                 v
      ORIGINAL WORKING RAG ENGINE
                 |
        +--------+--------+
        |        |        |
      Parse    Chunk    Embed
        |        |        |
        +--------+--------+
                 |
                 v
          Vector Retrieval
                 |
                 v
             Reranking
                 |
                 v
        Grounded RAG Results
                 |
                 v
       Evidence / Signals /
       DNA / Causal / Radar /
       Prediction / etc.
                 |
                 v
        CURRENT FAILUREOPS X
              FRONTEND

The CURRENT frontend is the presentation layer.

The ORIGINAL RAG backend is the intelligence/retrieval layer.

These must NOT be treated as two separate products.

============================================================
# 2. FIRST TASK — DO NOT MODIFY CODE YET
============================================================

Before changing anything, inspect the entire repository.

Perform a READ-ONLY architecture audit first.

Identify:

A. Current frontend
- Next.js application
- app routes
- components
- API clients
- BFF routes
- frontend environment configuration

B. Current backend
- FastAPI application
- API routers
- services
- database layer
- background jobs
- storage
- authentication/tenant handling

C. ORIGINAL RAG implementation
Find the existing canonical implementation for:

- document ingestion
- file loading
- PDF parsing
- DOCX parsing
- XLSX parsing
- CSV parsing
- TXT parsing
- Markdown parsing
- chunking
- embeddings
- vector storage
- retrieval
- BM25/keyword retrieval
- dense retrieval
- RRF/hybrid retrieval
- reranking
- grounded retrieval
- evidence generation
- citation/provenance

D. Identify whether there are now duplicate implementations.

DO NOT assume that newer code is better.

The ORIGINAL WORKING RAG implementation is the source of truth unless there is concrete evidence that a particular fix is required.

============================================================
# 3. PRESERVE THE ORIGINAL WORKING RAG
============================================================

This is CRITICAL.

The original RAG was already working.

Therefore:

DO NOT rewrite the RAG.

DO NOT replace the original retrieval algorithm.

DO NOT create a second embedding pipeline.

DO NOT create a second chunking pipeline.

DO NOT create a second vector database/table unnecessarily.

DO NOT create another document ingestion service.

DO NOT create another retrieval service.

DO NOT duplicate RAG logic into frontend code.

DO NOT copy RAG functionality into the BFF.

DO NOT implement a "new improved RAG" unless absolutely required.

Instead:

CONNECT the existing working RAG backend to the current FailureOps X backend/API architecture.

If a newer layer already wraps the RAG, inspect whether it is correctly calling the canonical RAG implementation.

If it is not, fix the integration rather than duplicating the RAG.

============================================================
# 4. DETERMINE THE REAL RAG ENTRY POINT
============================================================

Trace the complete execution path.

Find exactly:

USER UPLOAD
    ↓
frontend upload handler
    ↓
BFF/API proxy
    ↓
backend upload endpoint
    ↓
document service
    ↓
parser
    ↓
chunker
    ↓
embedding
    ↓
vector persistence
    ↓
retrieval
    ↓
reranker
    ↓
RAG result
    ↓
Evidence Intelligence
    ↓
Signals
    ↓
Failure DNA
    ↓
Causal Analysis
    ↓
Prediction
    ↓
Radar
    ↓
Frontend rendering

For every step, determine:

1. Which file performs it?
2. Which API endpoint triggers it?
3. What data enters?
4. What data comes out?
5. Is the next layer actually receiving that output?
6. Is the frontend receiving the final data?
7. Is any mock/static/fallback data being inserted?

Document the findings before modifying implementation.

============================================================
# 5. VERIFY WHETHER THE RAG BACKEND IS ACTUALLY RUNNING
============================================================

Do not simply assume the RAG is running because the files exist.

Verify it.

Check:

- backend process
- FastAPI startup
- RAG service initialization
- embedding service initialization
- vector database connection
- database tables
- document storage
- retrieval service
- required environment variables
- API connectivity
- frontend → BFF connectivity
- BFF → backend connectivity
- backend → RAG connectivity

Check actual runtime behavior.

The important question is:

"Can a real file uploaded through the CURRENT FailureOps X frontend travel through the CURRENT backend and reach the ORIGINAL RAG engine?"

If not, identify exactly where the chain breaks.

============================================================
# 6. VERIFY THE RAG WITH A REAL TEST FILE
============================================================

Create/use a small deterministic test document.

Example:

filename:
rag-integration-test.txt

contents:

FAILUREOPS RAG INTEGRATION TEST

Project: Alpha Test

The activation rate decreased from 82% to 47%.

The deployment failure rate increased from 4% to 19%.

The release deadline is 15 October 2026.

The main operational issue is CI/CD instability.

The engineering team currently has 12 unresolved P1 bugs.

These exact values MUST be traceable through the RAG.

Upload this file ONLY through the CURRENT FailureOps X frontend.

Do not insert it directly into the database.

Do not manually seed the evidence.

Do not manually create signals.

Do not hardcode the expected result.

============================================================
# 7. VERIFY DOCUMENT INGESTION
============================================================

After uploading the test file, verify:

- upload succeeds
- document record is created
- correct project_id is attached
- correct organization_id/tenant is attached
- physical file exists
- parser executes
- extracted text is non-empty
- chunks are created
- chunk count > 0
- chunks contain actual document text
- document_id is preserved
- chunk lineage is preserved
- embeddings are generated
- embeddings are stored
- vector dimensions are correct
- ingestion status becomes COMPLETED
- ingestion errors are surfaced if something fails

DO NOT accept:

"Upload successful"

as proof that RAG works.

Upload success only proves that the file reached the upload endpoint.

============================================================
# 8. VERIFY RETRIEVAL
============================================================

Test the canonical retrieval implementation directly through the backend.

Search for:

"activation rate"

Expected:

The retrieved chunks MUST contain:

82%

47%

and relevant surrounding context.

Then search:

"CI/CD instability"

Expected:

The retrieved chunks MUST contain the corresponding source text.

Then search:

"15 October 2026"

Expected:

The release deadline information MUST be retrieved.

The result MUST contain actual chunks from the uploaded file.

No hardcoded response is acceptable.

============================================================
# 9. VERIFY RAG GROUNDING
============================================================

The RAG output must contain provenance.

For every generated evidence item, preserve:

- project_id
- organization_id
- document_id
- chunk_id
- source filename
- source location/page if available
- extracted text/snippet
- confidence
- citation/reference

Example:

Evidence:
"Activation rate decreased from 82% to 47%."

Source:
rag-integration-test.txt

Chunk:
<real chunk ID>

The frontend must ultimately be able to display this relationship.

============================================================
# 10. VERIFY CURRENT FRONTEND INTEGRATION
============================================================

The CURRENT FailureOps X frontend must consume the real backend output.

Verify:

CURRENT FRONTEND
    ↓
CURRENT BFF
    ↓
CURRENT BACKEND
    ↓
ORIGINAL RAG
    ↓
DATABASE / VECTOR STORE
    ↓
REAL RESULTS
    ↓
CURRENT FRONTEND

No old RAG frontend should be involved.

No old RAG page should be rendered.

No iframe.

No redirect.

No copied RAG dashboard.

No separate RAG application.

============================================================
# 11. REMOVE MOCK/PRESET DATA ONLY WHERE IT IS ACTUALLY MOCK
============================================================

The current frontend must NEVER show pre-populated example data for a new project.

Examples that must NOT appear automatically:

- fake documents
- "Product Plan.txt"
- "Customer Survey.csv"
- fake 82% risk
- fake 50% risk
- fake 89% historical similarity
- fake signals
- fake evidence
- fake causal nodes
- fake prediction
- fake interventions
- fake outcome metrics
- fake historical cases

A newly registered project should start with:

0 documents
0 chunks
0 evidence
0 signals
0 failure DNA results
0 causal nodes
0 predictions
0 interventions
0 experiments
0 outcomes

until real user data produces them.

IMPORTANT:

Do NOT delete legitimate backend/RAG functionality merely because it contains fallback handling.

Differentiate between:

REAL FALLBACK FOR SYSTEM RESILIENCE

and

FAKE PRODUCT DATA.

Only remove the latter.

============================================================
# 12. UPLOAD SCREEN REQUIREMENTS
============================================================

The current upload page must represent REAL project data.

When a new project is created:

DO NOT display preloaded/mock files.

The upload page must initially show:

"No evidence uploaded yet."

or equivalent honest empty state.

The user must be able to:

- select a real file
- upload it
- see upload progress
- see processing state
- see indexed/processed status
- see extracted document count
- see errors if processing fails
- replace a file if supported
- delete a file if supported
- refresh and still see the actual backend state

The frontend must obtain the document list from the backend.

Never create the initial document list in React/Next.js static data.

============================================================
# 13. ANALYSIS PIPELINE
============================================================

The "Run Analysis" action must trigger the REAL backend analysis pipeline.

Expected flow:

Run Analysis
    ↓
backend analysis endpoint
    ↓
retrieve real project chunks
    ↓
Evidence Intelligence
    ↓
Signal extraction
    ↓
Failure DNA
    ↓
Causal graph
    ↓
Prediction
    ↓
Intervention recommendations
    ↓
persist results
    ↓
frontend refresh/polling
    ↓
display real results

Do not simulate progress.

Do not display fake 20%, 50%, 80%, 100% progress unless the backend actually reports those states.

If the backend is processing asynchronously, use the real job/status endpoint.

============================================================
# 14. SIGNAL EXPLORER
============================================================

The Signal Explorer must NOT say:

"No Active Operational Signals"

if real signals were successfully generated by the backend.

Trace:

Evidence
    ↓
Signal Agent
    ↓
Signal persistence
    ↓
GET /signals
    ↓
BFF
    ↓
frontend

Check every boundary.

If the backend contains signals but frontend shows zero:

FIX THE DATA CONTRACT / API MAPPING.

Do NOT generate fake signals in the frontend.

If the backend has zero signals because the RAG did not produce evidence:

FIX THE RAG/analysis pipeline instead.

============================================================
# 15. CAUSAL ANALYSIS
============================================================

The Causal Analysis page must use real causal nodes and edges generated from the project's real evidence/signals.

Do not use hardcoded nodes.

Do not use example projects.

Do not show a red error merely because the project has insufficient data.

Correct behavior:

If data exists:
→ show real causal graph.

If data does not exist:
→ show honest empty state explaining what is missing.

If backend request fails:
→ show actual error state.

These three states MUST remain separate.

============================================================
# 16. FRONTEND REFRESH / STATE BUG
============================================================

There is currently behavior where:

- one screen appears briefly after refresh
- then another empty/static state replaces it

Investigate this carefully.

Likely areas:

- initial React state
- loading state
- useEffect
- stale cached data
- route params
- BFF response
- hydration
- server/client rendering mismatch
- API race conditions
- incorrect fallback state
- failed API response being treated as empty data

Do NOT fix this by adding fake default data.

The final rendered state must be based on the latest successful backend response.

Correct state machine:

LOADING
   ↓
API SUCCESS → REAL DATA
   ↓
or
API SUCCESS + EMPTY → HONEST EMPTY STATE
   ↓
or
API ERROR → ERROR STATE

Never:

LOADING
   ↓
MOCK DATA
   ↓
REAL DATA

============================================================
# 17. ENVIRONMENT CONFIGURATION
============================================================

Verify environment configuration.

Frontend:

NEXT_PUBLIC_APP_URL

Backend:

DATABASE_URL
RAG_INTERNAL_URL

and any existing required:

NVIDIA_PARSE_API_KEY
NVIDIA_LLM_API_KEY
NVIDIA_EMBED_API_KEY
NVIDIA_RERANK_API_KEY
JWT_SECRET

Use the variables already defined by the project where applicable.

DO NOT expose secrets through NEXT_PUBLIC_* variables.

Frontend must NEVER receive private API keys.

Create/update .env.example if needed.

Do NOT overwrite existing .env values blindly.

If .env already exists:

INSPECT IT FIRST.

Preserve existing working configuration.

============================================================
# 18. API CONTRACT AUDIT
============================================================

For every frontend API request verify:

- URL
- HTTP method
- headers
- tenant/org header
- authentication
- request body
- multipart handling
- response schema
- error schema
- status codes

Compare:

Frontend expected response

against

Backend actual response.

Do not simply change frontend types to hide backend errors.

Fix the actual contract mismatch.

============================================================
# 19. TENANT / PROJECT ISOLATION
============================================================

Every document, chunk, evidence item, signal, prediction, causal node, etc. must belong to the correct:

organization_id
project_id

Verify that a project cannot retrieve another project's RAG data.

Test:

Project A uploads document A.

Project B must NOT retrieve document A.

This must work through:

frontend
→ BFF
→ backend
→ RAG retrieval.

Do not rely only on frontend filtering.

============================================================
# 20. DO NOT DUPLICATE EXISTING IMPLEMENTATIONS
============================================================

This is a HARD REQUIREMENT.

Before creating ANY file/service/function:

SEARCH THE REPOSITORY.

If functionality already exists:

REUSE IT.

If it is broken:

FIX IT.

If another layer wraps it incorrectly:

FIX THE CONNECTION.

Do NOT create:

document_service_v2
rag_service_new
retrieval_service_v2
new_chunker
new_embedding_service
new_vector_store
new_analysis_pipeline
new_signal_engine

unless absolutely necessary and explicitly justified.

Do not duplicate existing endpoints.

Do not create competing APIs for the same functionality.

There must be ONE canonical implementation for each subsystem.

============================================================
# 21. DO NOT DELETE WORKING CODE
============================================================

Do not perform broad deletions.

Do not rewrite large files unnecessarily.

Do not replace working modules simply to make integration easier.

Before modifying a canonical RAG file:

1. Explain why it must change.
2. Identify exactly what is broken.
3. Make the smallest possible change.
4. Preserve existing behavior.
5. Run the existing tests.

If integration can be fixed without changing the original RAG:

DO THAT.

============================================================
# 22. DO NOT REWRITE THE ORIGINAL RAG FRONTEND
============================================================

The old RAG frontend is NOT the target UI.

It is irrelevant as a presentation layer.

Only use the old RAG frontend as a reference if needed to understand:

- API contracts
- request formats
- response formats
- RAG execution
- expected backend behavior

But the user must interact ONLY with:

CURRENT FAILUREOPS X FRONTEND.

============================================================
# 23. END-TO-END ACCEPTANCE TEST
============================================================

After fixing, perform this exact test.

STEP 1:
Register a brand-new project.

Expected:
No mock documents.

STEP 2:
Open Upload Evidence.

Expected:
0 documents.

STEP 3:
Upload the test document.

Expected:

Document appears in CURRENT frontend.

Backend:
document exists.

Chunks:
> 0.

Embeddings:
> 0.

Status:
COMPLETED.

STEP 4:
Refresh browser.

Expected:
The uploaded document remains visible.

No mock document appears.

STEP 5:
Run Analysis.

Expected:
Real backend job starts.

STEP 6:
Wait for completion.

Expected:
Evidence generated from uploaded document.

STEP 7:
Open Evidence Intelligence.

Expected:
Real evidence containing:

82% → 47%
4% → 19%
15 October 2026
CI/CD instability
12 P1 bugs

STEP 8:
Open Signal Explorer.

Expected:
Real signals derived from that evidence.

STEP 9:
Open Failure DNA.

Expected:
Real risk calculation based on actual project evidence.

STEP 10:
Open Causal Analysis.

Expected:
Real nodes/edges if enough evidence exists.

STEP 11:
Open Prediction.

Expected:
Real prediction or honest insufficient-data state.

STEP 12:
Open Interventions.

Expected:
Recommendations grounded in actual evidence.

STEP 13:
Refresh every page.

Expected:
Data remains consistent.

STEP 14:
Open browser Network tab.

Verify the data is actually coming from:

CURRENT FRONTEND
→ BFF
→ BACKEND
→ RAG

and NOT from:

- static arrays
- mock JSON
- localStorage fake data
- hardcoded constants
- old RAG frontend
- demo fixtures

============================================================
# 24. REQUIRED RAG HEALTH CHECK
============================================================

Add/use a backend health/debug mechanism if one already exists.

It should allow us to determine:

RAG backend:
UP/DOWN

Database:
CONNECTED/DISCONNECTED

Vector store:
READY/NOT READY

Embedding service:
READY/FAILED

Document ingestion:
READY/FAILED

Retriever:
READY/FAILED

Reranker:
READY/FAILED

Analysis pipeline:
READY/FAILED

Do NOT expose secrets.

This is for diagnostics, not a fake status indicator.

A green "RAG Active" badge is NOT proof of RAG functionality.

============================================================
# 25. REQUIRED FINAL AUDIT
============================================================

After implementation, produce a report containing:

### A. ORIGINAL RAG
- Where the original RAG lives
- Which files are canonical
- Confirmation that it was preserved
- Any modifications made

### B. CURRENT FRONTEND
- Current frontend remains unchanged as the UI architecture
- Which pages were connected to backend
- Which API calls are used

### C. DATA FLOW
Show the actual working flow:

Upload
→ BFF
→ Backend
→ RAG
→ Chunks
→ Embeddings
→ Retrieval
→ Evidence
→ Signals
→ DNA
→ Causal
→ Prediction
→ Interventions
→ Frontend

### D. DUPLICATION AUDIT
Explicitly report:

- duplicate ingestion pipelines: YES/NO
- duplicate chunkers: YES/NO
- duplicate embedding engines: YES/NO
- duplicate vector stores: YES/NO
- duplicate retrieval engines: YES/NO
- duplicate frontend RAG: YES/NO

If YES, explain exactly why.

### E. MOCK DATA AUDIT
Search the entire frontend for:

- hardcoded project names
- fake documents
- fake metrics
- fake evidence
- fake signals
- fake risk scores
- fake predictions
- fake causal nodes
- fake intervention data
- demo arrays
- fixtures
- static fallbacks

Remove only actual product mock data.

### F. TEST RESULTS
Report actual results for:

- upload
- extraction
- chunking
- embeddings
- retrieval
- RAG grounding
- evidence
- signals
- failure DNA
- causal graph
- prediction
- interventions
- frontend rendering
- refresh persistence
- tenant isolation

============================================================
# 26. MOST IMPORTANT RULE
============================================================

DO NOT "FIX" THIS BY BUILDING ANOTHER RAG.

DO NOT "FIX" THIS BY BUILDING ANOTHER FRONTEND.

DO NOT "FIX" THIS BY HARDCODING RESULTS.

DO NOT "FIX" THIS BY COPYING THE OLD RAG UI.

DO NOT "FIX" THIS BY DELETING THE ORIGINAL RAG.

The goal is:

                    ORIGINAL WORKING RAG
                            +
                    CURRENT BACKEND
                            +
                  CURRENT FAILUREOPS X
                       FRONTEND
                            =
                 ONE WORKING SYSTEM

The original RAG remains the canonical intelligence engine.

The current FailureOps X frontend remains the canonical user interface.

The current backend/BFF provides the integration boundary.

============================================================
# 27. IMPLEMENTATION ORDER
============================================================

Follow this order strictly:

PHASE 1 — READ ONLY
→ inspect repository
→ identify original RAG
→ identify current frontend
→ identify current backend
→ map APIs
→ identify duplicates

PHASE 2 — RUNTIME VERIFICATION
→ start backend
→ verify RAG services
→ verify database/vector store
→ verify frontend
→ verify BFF
→ test connectivity

PHASE 3 — REAL INGESTION TEST
→ create test project
→ upload real test document through current frontend
→ verify parsing
→ verify chunks
→ verify embeddings
→ verify storage

PHASE 4 — REAL RAG TEST
→ retrieve uploaded content
→ verify actual chunk text
→ verify citations
→ verify provenance

PHASE 5 — PIPELINE TEST
→ Evidence
→ Signals
→ DNA
→ Causal
→ Prediction
→ Intervention

PHASE 6 — FRONTEND TEST
→ verify every screen consumes backend data
→ remove remaining mock/prepopulated UI data
→ fix loading/error/empty states
→ fix refresh/state issues

PHASE 7 — SECURITY
→ tenant isolation
→ authentication
→ authorization
→ secret protection

PHASE 8 — FINAL REGRESSION
→ run existing tests
→ run end-to-end test
→ verify original RAG still works
→ verify current frontend still works

============================================================
# 28. CHANGE CONTROL
============================================================

Before making a change, ask:

"Does this functionality already exist?"

If YES:
→ reuse/fix it.

"Was this part of the original working RAG?"

If YES:
→ preserve it.

"Can this integration be fixed without rewriting the RAG?"

If YES:
→ do that.

"Am I creating duplicate logic?"

If YES:
→ STOP and reuse the canonical implementation.

"Am I adding mock data to make the UI look populated?"

If YES:
→ STOP.

"Am I changing the frontend architecture?"

If YES:
→ STOP unless absolutely required.

============================================================
# FINAL SUCCESS CONDITION
============================================================

The task is NOT complete because the application compiles.

The task is NOT complete because an API returns HTTP 200.

The task is NOT complete because a "RAG Active" badge appears.

The task is complete ONLY when:

A real user can open the CURRENT FailureOps X frontend,

register a new project,

upload a real document,

see that document in the current frontend,

have that document processed by the ORIGINAL WORKING RAG,

see real extracted/chunked/embedded data,

run analysis,

receive real grounded evidence,

receive real signals,

receive real Failure DNA,

receive real causal analysis,

receive real predictions/interventions,

refresh the browser,

and still see the same persisted real data,

WITHOUT:

- mock data
- prepopulated demo files
- hardcoded results
- duplicate RAG
- duplicate frontend
- old RAG frontend
- fake success states
- broken API mappings.

PRESERVE WHAT ALREADY WORKS.
INTEGRATE — DO NOT REBUILD.
FIX — DO NOT DUPLICATE.
VERIFY WITH REAL DATA — DO NOT ASSUME.
```