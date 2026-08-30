MASTER FORENSIC FIX
FAILUREOPS ↔️ LANGGRAPH/RAG
MULTI-DOCUMENT RATE LIMITING + PROVIDER FAILOVER + UNREACHABLE STATUS API
+ STUCK PIPELINE STATE + FRONTEND POLLING + RESUMABLE ANALYSIS

We have now reproduced a real production integration failure.

DO NOT PATCH ONLY THE SCREEN.
DO NOT ADD FAKE PROGRESS.
DO NOT HARD-CODE THE SAMPLE PROJECT.
DO NOT HARD-CODE RETRY DELAYS.
DO NOT SIMPLY ROTATE API KEYS.
DO NOT HIDE 429 ERRORS.
DO NOT CLAIM SUCCESS WITHOUT LIVE PROOF.

The goal is to fix the underlying architecture so future projects and future
document uploads work correctly.

============================================================
CURRENT REAL FAILURE — MUST REPRODUCE AND FIX
============================================================

The FailureOps application currently shows:

Stage:
Blocked

2 of 12

Last run:
Failed

Backend stages:

Document parsing:
COMPLETED

Chunking & embedding:
COMPLETED

Evidence retrieval:
RUNNING

Evidence Agent:
WAITING / BLOCKED

The browser console simultaneously shows repeated:

FAILED TO LOAD RESOURCE:
 /api/langgraph/run/lg_mtf4i1y_u73y
HTTP 429 Too Many Requests

and:

FAILED TO LOAD RESOURCE:
 /api/rag/pipeline?projectId=hello-gm
HTTP 429 Too Many Requests

and:

Failed to load project documents:
Error: Rate limit exceeded for this operation.
Please try again in N seconds.

and also:

/api/analysis/status?projectId=hello-gm
net::ERR_ADDRESS_UNREACHABLE

There are repeated 429 requests from the frontend/status layer.

This indicates at least TWO separate problems:

A. LLM / LangGraph / RAG rate limiting is not being handled correctly.

B. The analysis status/pipeline endpoint is not reliably reachable from the
frontend.

C. The frontend can continue polling/re-requesting while the backend is already
blocked/failed.

D. Backend stage state and frontend display state can become inconsistent.

E. The system does not have a clean, centralized analysis/job lifecycle.

FIRST AUDIT.
THEN IMPLEMENT.
THEN VERIFY END TO END.

============================================================
1. FORENSIC AUDIT — ABSOLUTELY FIRST
============================================================

Before modifying production code, inspect the entire integration path.

TRACE THESE EXACT REQUESTS:

/api/langgraph/run/*
/api/rag/pipeline
/api/analysis/status
/api/analysis
/api/projects/*
any LangGraph proxy/BFF routes
any RAG proxy routes

Determine:

Browser
  ↓
FailureOps frontend
  ↓
Next.js/BFF or backend proxy
  ↓
FailureOps backend
  ↓
LangGraph/RAG
  ↓
LLM provider
  ↓
PostgreSQL / RustFS

For each hop determine:

- host
- port
- protocol
- authentication
- timeout
- retry
- status code handling
- response schema
- ownership of state
- whether the route is server-side or browser-side

============================================================
2. AUDIT THE EXACT 429 SOURCE
============================================================

Determine whether the 429 comes from:

A. frontend API route
B. FailureOps backend
C. LangGraph/RAG service
D. LLM provider
E. provider proxy
F. rate limiter
G. database/API intermediary

Do NOT assume.

Trace the actual response headers/body.

Determine:

- provider
- model
- endpoint
- retry-after
- quota
- request rate
- concurrency
- number of simultaneous requests
- number of repeated browser polls

Do not print API secrets.

============================================================
3. AUDIT THE ERR_ADDRESS_UNREACHABLE
============================================================

The browser reports:

/api/analysis/status?projectId=hello-gm
net::ERR_ADDRESS_UNREACHABLE

Find the exact reason.

Check:

- frontend origin
- backend origin
- reverse proxy
- Next.js rewrite/proxy
- API base URL
- hostname
- port
- Docker networking
- localhost references
- service binding address
- CORS
- environment variables
- production vs local URLs

Do not fix this by hardcoding one production IP.

The correct solution must use environment configuration.

============================================================
4. EXPLICIT SERVICE / PORT ARCHITECTURE
============================================================

The system must remain split into independently running services.

Example local architecture:

FailureOps Frontend
    port 5173

        ↓ HTTP

FailureOps Backend
    port 8000

        ↓ HTTP

LangGraph/RAG Intelligence Service
    port 8001

        ↓

PostgreSQL
    port 5432

        ↓ / object storage

RustFS
    API 9000
    Console 9001

Exact ports must come from environment/configuration.

NEVER hardcode service addresses in application logic.

Never allow:

Frontend → PostgreSQL

Frontend → RustFS admin credentials

Frontend → internal LangGraph nodes

The correct flow is:

Frontend
    ↓
FailureOps Backend / BFF
    ↓
LangGraph/RAG Service
    ↓
Postgres / RustFS

============================================================
5. FIX API BASE URL CONFIGURATION
============================================================

Audit every frontend API call.

Search for:

localhost
127.0.0.1
5173
8000
8001
hardcoded hostnames
hardcoded production URLs

Environment configuration must define service endpoints.

Frontend should call the correct frontend/BFF routes.

Backend should call the internal LangGraph/RAG service.

Do not expose internal service addresses unnecessarily.

For production:

browser
→ public FailureOps API

server-to-server
→ internal LangGraph URL

============================================================
6. CREATE ONE AUTHORITATIVE ANALYSIS JOB MODEL
============================================================

There must be exactly ONE backend source of truth for analysis state.

Conceptually:

AnalysisJob

Fields should include where appropriate:

analysis_id
project_id
organization_id
status
current_stage
stage_states
created_at
started_at
completed_at
failed_at
error_code
error_message
retryable
progress
processed_count
total_count
last_updated_at

Do not make the frontend infer state by combining several unrelated APIs.

============================================================
7. ANALYSIS STATE MACHINE
============================================================

Define a deterministic state machine.

Overall status:

QUEUED
RUNNING
RETRYING
PARTIAL
COMPLETED
FAILED
CANCELLED

Stage status:

NOT_STARTED
QUEUED
RUNNING
RETRYING
COMPLETED
PARTIAL
FAILED
SKIPPED

A failed stage MUST NOT remain:

RUNNING

forever.

If Evidence Retrieval receives a fatal error:

Evidence Retrieval = FAILED

If rate limited and retrying:

Evidence Retrieval = RETRYING

If work is queued:

Evidence Retrieval = QUEUED

Never fake RUNNING.

============================================================
8. FIX THE EXACT SCREENSHOT INCONSISTENCY
============================================================

Current UI:

Overall:
BLOCKED
2/12

but:

Evidence Retrieval:
RUNNING

This is invalid unless a backend state explicitly says:

overall = BLOCKED
current_stage = EVIDENCE_RETRIEVAL
stage_status = RETRYING/RATE_LIMITED

If the operation has failed:

Overall = FAILED
Evidence Retrieval = FAILED or RETRYING depending on actual state

The frontend must derive stage badges entirely from backend state.

No frontend guesses.

============================================================
9. RATE LIMITING — CENTRALIZED
============================================================

There must be ONE centralized LLM request scheduler.

Every LLM call from:

Evidence Agent
Signal Agent
Event/Claim extraction
other LLM-powered LangGraph nodes

must pass through the scheduler.

Do not let individual chunks independently hammer the provider.

No uncontrolled:

asyncio.gather(all_chunks)

No unbounded worker spawning.

Use:

global concurrency limit
+
provider-specific concurrency limit
+
queue
+
rate pacing

Configuration must come from environment.

============================================================
10. MULTI-PROVIDER / MULTI-KEY HANDLING
============================================================

Inspect the existing .env configuration.

Determine:

- providers
- models
- credential grouping
- quota relationships

Never print actual keys.

Do NOT assume multiple keys equal multiple independent quotas.

If multiple keys belong to the same provider/account, treat them according to
actual provider quota semantics.

Do not create:

5 keys × 20 chunks = 100 simultaneous requests

Instead:

request queue
→ scheduler
→ provider selection
→ bounded concurrency
→ response

============================================================
11. PROVIDER FAILOVER
============================================================

Implement controlled provider selection.

Provider states:

HEALTHY
THROTTLED
UNAVAILABLE
AUTH_FAILED
DISABLED

When provider A returns 429:

1. read Retry-After if available
2. mark provider A THROTTLED
3. apply cooldown
4. route eligible work to another HEALTHY provider
5. otherwise queue work
6. do not hammer provider A

Do not randomly rotate credentials.

Do not retry immediately at full speed.

============================================================
12. RETRY WITH EXPONENTIAL BACKOFF
============================================================

Implement:

exponential backoff
+
jitter
+
Retry-After support

Configuration:

MAX_RETRIES
BASE_DELAY
MAX_DELAY

must be configurable.

A rate-limited request should not generate dozens of identical requests.

============================================================
13. FRONTEND POLLING MUST NOT CAUSE A REQUEST STORM
============================================================

This screenshot strongly suggests repeated browser requests.

Audit polling.

Do NOT poll aggressively.

Use a reasonable bounded polling interval.

More importantly:

When a job reaches:

FAILED
COMPLETED
CANCELLED

stop polling.

When:

RETRYING

poll at a slower controlled interval.

Do not have:

three components
+
three hooks
+
two API routes

all polling the same analysis.

There must be one authoritative polling mechanism per active analysis.

============================================================
14. API REQUEST DEDUPLICATION
============================================================

Prevent duplicate concurrent calls for the same:

project
+
analysis_id
+
operation

Examples:

Five frontend refreshes must NOT create five LangGraph runs.

Use idempotency / request deduplication.

If an analysis is already running:

POST analyze

should either:

return existing analysis_id

or

explicitly reject duplicate execution.

Do not start another LangGraph execution.

============================================================
15. LANGGRAPH RUN DEDUPLICATION
============================================================

The endpoint:

/api/langgraph/run/<id>

must correspond to one analysis execution.

Do not generate new runs from:

frontend refresh
status polling
component remount
route navigation

Polling must read state.

Polling must NEVER trigger work.

IMPORTANT:

GET status
must never launch analysis.

============================================================
16. SEPARATE COMMAND APIs FROM QUERY APIs
============================================================

Commands:

POST /analysis
POST /analysis/retry
POST /documents/upload

Queries:

GET /analysis/{analysis_id}
GET /analysis/{analysis_id}/status
GET /analysis/{analysis_id}/result
GET /pipeline/{project_id}

GET requests must be side-effect free.

Never trigger LangGraph from a GET status call.

============================================================
17. FIX /api/rag/pipeline
============================================================

Audit:

/api/rag/pipeline?projectId=hello-gm

Determine why it returns 429.

It should represent pipeline health/state.

It should NOT independently initiate expensive LLM work.

Pipeline health should read persisted operational state.

It must NOT call the LLM simply to answer:

"what is the current pipeline state?"

If current architecture does this, fix it.

============================================================
18. FIX /api/analysis/status
============================================================

The endpoint currently produces:

ERR_ADDRESS_UNREACHABLE

Make status retrieval reliable.

Requirements:

- correct backend URL
- correct proxy/rewrite
- correct environment config
- correct auth
- correct CORS where applicable
- timeout
- structured JSON response

Example conceptual response:

{
  "analysis_id": "...",
  "status": "RETRYING",
  "current_stage": "EVIDENCE_AGENT",
  "retry_after_seconds": 8,
  "processed": 12,
  "total": 30,
  "retryable": true
}

Use actual existing schema conventions where possible.

============================================================
19. DO NOT DUPLICATE STATUS SYSTEMS
============================================================

If the system currently has:

analysis status
pipeline status
LangGraph run status
document status

do not let each produce contradictory truth.

Define relationships.

Recommended:

Document status:
INGESTING / READY / FAILED

Analysis status:
QUEUED / RUNNING / RETRYING / PARTIAL / COMPLETED / FAILED

Pipeline health:
derived operational view

LangGraph execution:
internal execution details

Frontend should consume a stable normalized status.

============================================================
20. EVIDENCE AGENT — BOUNDED WORK
============================================================

For multiple documents:

documents
↓
retrieved chunks
↓
dedupe
↓
bounded queue
↓
Evidence Agent workers
↓
central LLM scheduler

Do not launch one LLM request per chunk without bounds.

If safe, batch related chunks.

Preserve:

document_id
chunk_id
page
row
section
source

============================================================
21. RESUMABLE EVIDENCE PROCESSING
============================================================

Persist:

successful chunk IDs
pending chunk IDs
failed chunk IDs

If 50 chunks:

40 successful
10 rate limited

do not restart all 50.

Resume only remaining work.

============================================================
22. PARTIAL SUCCESS
============================================================

If some evidence is successfully extracted before rate limiting:

preserve it.

Return:

PARTIAL

rather than:

empty result

when appropriate.

Example:

Evidence:
40 extracted

Pending:
8

Failed:
2

The UI must clearly show this.

============================================================
23. TIMEOUTS
============================================================

Every:

HTTP service call
LLM call
database call
RustFS operation

must have explicit timeout handling.

No infinite waits.

============================================================
24. ERROR NORMALIZATION
============================================================

Never send raw provider stack traces to frontend.

Use structured errors:

LLM_RATE_LIMITED
LLM_PROVIDER_UNAVAILABLE
LLM_AUTH_FAILED
LLM_TIMEOUT
LANGGRAPH_UNAVAILABLE
ANALYSIS_TIMEOUT
ANALYSIS_FAILED
PIPELINE_UNAVAILABLE

Include:

retryable
retry_after_seconds
failed_stage

where applicable.

============================================================
25. STATUS PAGE UX
============================================================

The current screen must accurately show states.

For rate limiting:

Evidence Agent

RATE LIMITED / RETRYING

Retrying in 8s

Queue:
12 chunks

Provider:
Provider B

For failed:

Evidence Agent
FAILED

Reason:
LLM provider unavailable

[Retry]

For successful:

Evidence Agent
COMPLETED

Do not show "RUNNING" while a request has already failed.

============================================================
26. STOP FRONTEND RETRIES AFTER TERMINAL FAILURE
============================================================

If backend says:

FAILED
retryable=false

frontend must stop polling.

If:

FAILED
retryable=true

show retry option.

If:

RETRYING

continue polling with controlled interval.

============================================================
27. ANALYSIS RETRY
============================================================

Retry should reuse the existing analysis context.

Do not create duplicate:

evidence
signals
events
claims

unless this is an intentional new version.

Prefer:

analysis attempt 1
analysis attempt 2

or equivalent attempt/version metadata.

============================================================
28. LANGGRAPH MUST REMAIN CENTRAL
============================================================

Do not bypass LangGraph.

Main application:

FailureOps Backend
↓
LangGraph service
↓
StateGraph
↓
retrieval
↓
Evidence Agent
↓
validation
↓
Signal Agent
↓
finalization

The rate-limit scheduler belongs underneath the LLM service layer.

Do not create an unrelated orchestration engine in the main application.

============================================================
29. PRESERVE CURRENT RAG CAPABILITIES
============================================================

Do NOT break:

- document parsing
- chunking
- embeddings
- pgvector
- BM25
- hybrid retrieval
- reranking
- provenance
- time-series engine
- event extraction
- claim extraction
- signal agent
- metric-aware risk scoring

The fix must be infrastructure/reliability focused.

============================================================
30. PRESERVE PRIVACY / TENANT ISOLATION
============================================================

All requests must retain:

organization_id
project_id
document scope
privacy scope

Rate-limit retry/failover must NEVER change authorization scope.

Never retry a request against a broader corpus.

Never mix:

private company A
private company B

Do not leak private document content into logs or provider errors.

============================================================
31. API CACHING / POLLING
============================================================

Status endpoints may be cached briefly where safe.

Do not cache user-specific analysis across organizations.

Cache keys should include:

organization
project
analysis_id

Results must remain tenant-isolated.

============================================================
32. RATE LIMIT TELEMETRY
============================================================

Expose safe diagnostics:

llm_requests
llm_successes
llm_retries
rate_limit_count
provider_failovers
queued_requests
active_requests
average_latency
last_error
analysis_duration

Never expose credentials.

============================================================
33. PIPELINE HEALTH
============================================================

The Pipeline Health screen should show actual state:

Documents
Chunks
Embeddings
Vector Storage
Retrieval
Evidence Agent
Signal Agent

Do not have Pipeline Health itself cause LLM work.

Health should query state.

============================================================
34. EXACT REPRODUCTION TEST
============================================================

Reproduce:

5 uploaded documents
→ run analysis

Then intentionally observe the previous failure conditions.

The system must NOT create a request storm.

Verify:

- bounded concurrency
- no duplicate analysis runs
- no duplicate status polling
- provider cooldown
- failover or queue
- correct job state
- no stuck RUNNING stage

============================================================
35. TEST SINGLE DOCUMENT FIRST
============================================================

Run:

1 document

Verify:

upload
→ parse
→ chunk
→ embed
→ retrieval
→ evidence
→ signals
→ completed

Then:

3 documents

Then:

5 documents

Only proceed once 1-document flow is stable.

============================================================
36. TEST PROVIDER RATE LIMITING
============================================================

Use controlled testing where possible.

Simulate:

429
Retry-After
timeout
provider unavailable
invalid key

Verify:

retry
cooldown
fallback
failure state
recovery

============================================================
37. TEST STATUS FAILURE
============================================================

Test:

backend unavailable
LangGraph unavailable
status endpoint unreachable
frontend reload during analysis
browser tab reopened
duplicate Run Analysis clicks

The system must remain consistent.

============================================================
38. TEST BROWSER REFRESH
============================================================

Start analysis.

Refresh browser.

Expected:

same analysis_id
same backend state
no duplicate analysis
no duplicate LLM calls

============================================================
39. TEST MULTI-TAB
============================================================

Open the same project in two browser tabs.

Click Run Analysis.

Expected:

one analysis job

not two.

============================================================
40. TEST RATE-LIMIT RECOVERY
============================================================

During an active analysis:

Provider A returns 429.

Expected:

Evidence Agent:
RETRYING / RATE LIMITED

If provider B healthy:

continue through provider B

If no provider healthy:

queue and wait

If retries exhausted:

FAILED / retryable

Never:

RUNNING forever

============================================================
41. TEST DOCUMENT PROVENANCE
============================================================

After recovery verify:

evidence
events
claims
signals

still contain:

document
page/row
chunk
citation
confidence

No provenance loss during retries/failover.

============================================================
42. TEST PRIVACY AFTER FAILOVER
============================================================

This is critical.

If private project A is being processed:

all provider retries and failovers must receive exactly the same authorized
retrieval scope.

A rate-limit recovery must NEVER broaden retrieval scope.

============================================================
43. DATABASE / PERSISTENCE
============================================================

Persist analysis state so the frontend can reconnect.

At minimum persist:

analysis_id
project_id
organization_id
status
current_stage
stage statuses
timestamps
error
retry state

Persist structured successful intermediate results.

============================================================
44. FRONTEND API ARCHITECTURE
============================================================

Prefer:

Browser
→ FailureOps BFF/API

BFF
→ FailureOps backend/internal APIs

Backend
→ LangGraph/RAG

Do not scatter direct LangGraph calls throughout React components.

Create a single integration client.

Example concept:

LangGraphClient

Methods:

ingestDocument()
startAnalysis()
getAnalysisStatus()
getAnalysisResult()
retryAnalysis()

Keep provider logic out of UI.

============================================================
45. FRONTEND DATA FETCHING
============================================================

Audit whether multiple components fetch the same project/analysis state.

Centralize active analysis state.

Avoid:

Overview polling
+
Pipeline Health polling
+
Analysis page polling
+
LangGraph component polling

all independently hitting the backend.

Use one controlled status stream/query.

============================================================
46. BACKEND SERVICE CLIENT
============================================================

Create/reuse a single LangGraph service client.

Responsibilities:

- base URL
- auth header
- timeout
- retries
- idempotency
- correlation ID
- request serialization
- response validation
- error normalization

The rest of the main backend should not construct raw LangGraph HTTP requests
everywhere.

============================================================
47. CORRELATION IDs
============================================================

Propagate:

request_id
analysis_id
project_id
organization_id

through:

browser request
→ FailureOps backend
→ LangGraph
→ provider layer

Use these for logs.

============================================================
48. LOGGING
============================================================

Record:

analysis started
analysis queued
retrieval started
retrieval completed
LLM request
LLM success
LLM 429
provider failover
retry
analysis completed
analysis failed

Do NOT log secrets or raw sensitive documents.

============================================================
49. NO HARDCODED TEST VALUES
============================================================

The screenshot's:

hello-gm
5 documents
19 seconds
specific API path IDs

are reproduction evidence only.

Do not hardcode them.

============================================================
50. ENVIRONMENT CONFIGURATION
============================================================

Use environment variables for:

FAILUREOPS_BACKEND_URL
LANGGRAPH_RAG_URL
LANGGRAPH_SERVICE_TOKEN
RAG_REQUEST_TIMEOUT
LLM_REQUEST_TIMEOUT
LLM_MAX_CONCURRENCY
LLM_PROVIDER_MAX_CONCURRENCY
LLM_MAX_RETRIES
LLM_RETRY_BASE_DELAY
LLM_RETRY_MAX_DELAY
ANALYSIS_POLL_INTERVAL
ANALYSIS_TIMEOUT

Names may follow existing project conventions.

Update .env.example only with placeholders.

Never commit secrets.

============================================================
51. DOCUMENT THE FINAL ARCHITECTURE
============================================================

Update integration documentation with:

Frontend
  ↓
FailureOps Backend
  ↓
LangGraph/RAG
  ↓
RAG retrieval
  ↓
LLM scheduler
  ↓
Evidence Agent
  ↓
Signal Agent
  ↓
structured intelligence
  ↓
FailureOps downstream

Also document:

rate-limit behavior
provider failover
job state
polling
retries
resumption
privacy
ports
environment variables

============================================================
52. ACCEPTANCE CRITERIA
============================================================

The implementation is considered successful ONLY when all are demonstrated:

A. 1-document analysis completes.

B. 3-document analysis completes.

C. 5-document analysis completes without request storm.

D. Controlled 429 is handled gracefully.

E. Another healthy provider can take work when appropriate.

F. If all providers are unavailable, the job becomes RETRYING or FAILED
   cleanly.

G. No stage remains RUNNING forever.

H. Browser refresh does not restart analysis.

I. Duplicate Run Analysis clicks do not create duplicate jobs.

J. Multiple browser tabs do not create duplicate jobs.

K. /api/analysis/status is reachable and reliable.

L. /api/rag/pipeline does not create LLM work.

M. Pipeline Health reflects real backend state.

N. Evidence Agent state matches actual state.

O. Successful evidence is preserved during retries.

P. Provenance remains correct.

Q. Private retrieval remains private during retries/failover.

R. Global opt-in rules remain unchanged.

S. LangGraph remains the orchestration core.

============================================================
53. REQUIRED TEST RESULTS
============================================================

Run:

backend unit tests
backend integration tests
security/tenant tests
LangGraph tests
rate-limit tests
frontend tests
frontend production build

Then perform live:

1-document
3-document
5-document
rate-limit recovery
provider failover
browser refresh
duplicate-click
multi-tab
status outage
privacy

============================================================
54. FINAL REPORT
============================================================

Return:

1. Exact root cause of the 429 problem
2. Exact root cause of ERR_ADDRESS_UNREACHABLE
3. Exact request causing frontend request storm, if any
4. Existing API topology
5. Final service topology
6. Frontend port
7. Backend port
8. LangGraph/RAG port
9. PostgreSQL port
10. RustFS ports
11. LLM providers/models detected
12. Key/quota grouping
13. New scheduler design
14. Concurrency limits
15. Retry strategy
16. Failover strategy
17. Circuit breaker/cooldown strategy
18. Job state machine
19. Frontend polling architecture
20. API deduplication/idempotency
21. Resume strategy
22. Partial success strategy
23. Error schema
24. Status endpoint fix
25. Pipeline endpoint fix
26. Files modified
27. Files created
28. Environment variables
29. Tests added
30. Test results
31. Live 1-document result
32. Live 3-document result
33. Live 5-document result
34. Controlled 429 result
35. Failover result
36. Refresh result
37. Multi-tab result
38. Privacy result
39. Final screenshots/log evidence
40. Remaining limitations

============================================================
55. FINAL NON-NEGOTIABLE RULE
============================================================

DO NOT say:

"fixed"
"production ready"
"fully integrated"

until the exact screenshot failure has been reproduced and resolved.

Specifically prove that this:

5 documents
→ retrieval
→ 429
→ frontend keeps polling
→ status endpoint unreachable
→ pipeline says RUNNING/BLOCKED inconsistently

has become:

5 documents
→ bounded queue
→ controlled LLM requests
→ rate-limit aware retry/failover
→ authoritative backend status
→ accurate frontend status
→ COMPLETED

OR, if no provider can recover:

5 documents
→ controlled queue
→ RETRYING
→ FAILED / retryable

with NO infinite RUNNING state.

============================================================
FIRST RESPONSE REQUIREMENT
============================================================

Do NOT implement immediately.

First return:

A. exact 429 source
B. exact ERR_ADDRESS_UNREACHABLE source
C. all affected endpoints
D. current polling behavior
E. current concurrency behavior
F. current LLM provider configuration structure
G. current job-state architecture
H. recommended fix
I. files to modify
J. files to create
K. any genuine blocking questions

Then proceed with implementation.