```text id="master-integration-prompt"
MASTER IMPLEMENTATION PROMPT
FAILUREOPS MAIN APPLICATION ↔️ LANGGRAPH/RAG INTELLIGENCE SERVICE INTEGRATION

We now have a separate, working LangGraph/RAG repository:

GitHub:
https://github.com/Princewinston/langgraph-rag.git

Local project:
P:\LangGraph_rag

This LangGraph/RAG service is intended to run independently from the main
FailureOps application on a different port.

YOUR TASK:
Integrate the existing FailureOps frontend/backend with this LangGraph/RAG
service so that the main FailureOps application can use RAG + LangGraph as a
real intelligence subsystem.

DO NOT duplicate the RAG implementation in the main project.

DO NOT replace the existing frontend.

DO NOT create fake/mock outputs.

DO NOT hardcode the sample screenshots/data.

FIRST AUDIT.
THEN DESIGN.
THEN IMPLEMENT.
THEN TEST END-TO-END.

============================================================
0. ABSOLUTE RULES
============================================================

1. Inspect the existing main FailureOps backend and frontend BEFORE changing
   anything.

2. Inspect the existing LangGraph/RAG repository BEFORE changing anything.

3. Reuse existing implementation wherever possible.

4. If a screen already exists:
   - KEEP the screen
   - KEEP the current UX
   - add/modify only the API integration needed

5. If a screen does not exist:
   - create it only when necessary
   - follow the existing application's design system

6. If an API already exists:
   - preserve it unless there is a real architectural reason to extend it
   - do not create duplicate endpoints

7. If integration endpoints do not exist:
   - create a clean versioned service/API boundary

8. No hardcoded sample output.

9. No frontend fixture JSON.

10. No direct database access from the frontend.

11. No frontend direct access to PostgreSQL/RustFS.

12. The LangGraph service owns:
    - RAG retrieval
    - evidence extraction
    - event extraction
    - claim extraction
    - time-series normalization
    - signal generation
    - metric-aware risk scoring
    - grounded intelligence result

13. The main FailureOps application owns:
    - product/project management
    - user/member authorization
    - project lifecycle
    - downstream FailureOps engines
    - Truth Engine
    - Failure DNA
    - Causal Analysis
    - Prediction
    - What-if
    - Interventions
    - Experiments
    - Outcomes
    - Radar
    where those already exist in the main application.

14. Do NOT move downstream FailureOps logic into the RAG service.

15. The integration must work with arbitrary future projects/documents.

============================================================
1. FIRST AUDIT — DO NOT CODE YET
============================================================

Audit both repositories.

MAIN FAILUREOPS APPLICATION:
- backend framework
- frontend framework
- routing
- project registration
- organization/company model
- privacy model
- evidence model
- project model
- document model
- RAG integration if any
- current APIs
- authentication
- authorization
- tenant isolation
- RustFS/object storage integration
- existing downstream engines
- Truth Engine
- Evidence Intelligence
- Ask/Evidence
- Pipeline Health
- Failure DNA
- Failure Radar
- Causal Analysis
- Prediction
- What-if
- Interventions

LANGGRAPH/RAG SERVICE:
- actual production endpoints
- actual LangGraph graph
- StateGraph/state schema
- graph compile/invoke path
- document upload
- document parsing
- chunking
- embeddings
- vector search
- BM25
- reranking
- evidence agent
- event/claim extraction
- time-series engine
- signal agent
- metric-aware risk scoring
- provenance model
- PostgreSQL usage
- RustFS usage
- existing schemas
- authentication headers
- organization/project scoping

Produce an audit table:

FEATURE
MAIN APP EXISTS?
RAG SERVICE EXISTS?
CURRENT API?
CURRENT SCREEN?
IMPLEMENTATION STATUS
INTEGRATION NEEDED?

DO NOT MODIFY CODE DURING THIS AUDIT PHASE.

============================================================
2. ARCHITECTURAL GOAL
============================================================

Target architecture:

                MAIN FAILUREOPS APP
                       |
                       | authenticated service calls
                       v
              LANGGRAPH INTELLIGENCE
                       |
        +--------------+--------------+
        |                             |
       RAG                         LangGraph
        |                             |
 ingestion/retrieval          orchestration
        |                             |
        +-------------+---------------+
                      |
                Structured Result
                      |
      +---------------+----------------+
      |               |                |
   Evidence        Signals        Events/Claims
      |               |                |
      +---------------+----------------+
                      |
             Main FailureOps Backend
                      |
      +---------------+----------------+
      |               |                |
 Failure DNA     Truth Engine      Prediction...
```

The LangGraph service is a separate internal service.

The main application must call it through HTTP/API.

============================================================
3. SERVICE CONFIGURATION
========================

Introduce configuration such as:

LANGGRAPH_RAG_URL=[http://127.0.0.1](http://127.0.0.1):<port>

or appropriate deployment URL.

Never hardcode:

localhost
ports
tokens
organization IDs
project IDs

Use environment configuration.

Support:

development
testing
production

Do not expose internal service credentials to the browser.

The browser should call the main FailureOps backend/BFF.

MAIN BACKEND
↓
authenticated service call
↓
LANGGRAPH/RAG SERVICE

NOT:

browser
↓
LangGraph internal service

unless the existing deployment architecture proves this is safe and intended.

============================================================
4. AUTHENTICATION + TENANT ISOLATION
====================================

This is CRITICAL.

Every LangGraph request must carry enough trusted context to enforce:

organization_id
project_id
user/member identity where required
privacy scope
request ID / correlation ID

Never trust project_id from the client alone.

The main backend must verify:

authenticated user
→ organization membership
→ project membership
→ requested project

before calling LangGraph.

LangGraph must ALSO validate the organization/project scope.

Defense in depth.

A user must NEVER retrieve another company's private documents.

============================================================
5. DOCUMENT PRIVACY MODEL
=========================

Support two document visibility modes:

PRIVATE
GLOBAL_OPT_IN

PRIVATE:

Document may only be used for the owning organization/project according to
normal authorization rules.

It MUST NEVER appear in global similarity retrieval.

GLOBAL_OPT_IN:

Document may participate in global/shared retrieval only after explicit
organization/user consent according to the main application's privacy policy.

Global retrieval must NEVER allow a private document to leak into another
organization's answer.

Define a clear metadata field, for example:

visibility_scope:
PRIVATE
GLOBAL

or equivalent enum.

Do not use arbitrary strings throughout the code.

The visibility field must be enforced in retrieval itself, not just hidden in
the UI.

============================================================
6. GLOBAL RETRIEVAL BEHAVIOR
============================

There are two separate concepts:

A. PRIVATE PROJECT RETRIEVAL

Query only allowed project/org documents.

B. GLOBAL OPT-IN RETRIEVAL

Query:

* current organization's allowed documents
* globally opted-in documents

BUT:

GLOBAL retrieval must NEVER include:

* private documents from another organization
* documents without global consent
* unauthorized projects

Retrieval must enforce the metadata filters BEFORE ranking/result assembly.

Do not retrieve everything first and filter afterward if that could leak
metadata or content.

Prefer database/vector-level filtering.

============================================================
7. PROJECT REGISTRATION
=======================

The main FailureOps project registration screen already exists.

Do not rebuild it.

Audit its current form.

The registration metadata should become project metadata available to the
LangGraph/RAG layer.

Typical metadata:

organization/company
project name
industry
stage
launch target
target personas
project description
privacy settings
evidence source categories
other existing project metadata

IMPORTANT:

Metadata is an optional retrieval/calibration signal.

It must NOT be required to make RAG work.

Example:

project metadata:
industry = SaaS
stage = Beta
launch target = date

This can help:

* retrieval
* interpretation
* risk context
* document classification

but the actual answer must still come from uploaded evidence.

Never fabricate missing metadata.

============================================================
8. DOCUMENT UPLOAD FLOW
=======================

The current upload screen already exists.

Keep the current UX.

When user uploads a document:

MAIN APP:

1. authenticate
2. authorize project
3. collect optional metadata
4. determine visibility
5. store/register document
6. send document to LangGraph/RAG ingestion
7. track processing status

Optional metadata popup:

Do NOT force metadata.

Possible optional fields:

document category
effective date
department/team
project phase
visibility
source system
document owner

The RAG service should work correctly even when these values are blank.

Use them as additional metadata filters only when present.

============================================================
9. OBJECT STORAGE — RUSTFS
==========================

Use RustFS/object storage for original document files.

The database should store metadata and references.

Do NOT put the full PDF/document binary directly into relational database
records.

Store:

document_id
project_id
organization_id
object_storage_key
filename
content_type
size
checksum
visibility
metadata
processing_status

The RAG service should receive a secure reference or authorized upload path.

Never expose raw object-storage credentials to the browser.

============================================================
10. DOCUMENT PROCESSING
=======================

After upload, the UI must show the real processing lifecycle.

Expected conceptual flow:

UPLOAD
↓
OBJECT STORAGE
↓
PARSER
↓
CHUNKING
↓
EMBEDDING
↓
VECTOR STORAGE
↓
INDEX READY
↓
AVAILABLE FOR RAG
↓
OPTIONAL PROJECT INTELLIGENCE ANALYSIS

Use real backend state.

Do not make a fake progress animation.

If the current main application has Pipeline Health already, reuse it.

If it exists, connect the pipeline cards to actual status APIs.

If it does not exist, create the minimum useful pipeline telemetry.

============================================================
11. LANGGRAPH PIPELINE
======================

Use the existing production LangGraph pipeline.

Current graph:

validate_request
→ retrieve_evidence
→ evidence_agent
→ validate_evidence
→ signal_agent
→ validate_signals
→ finalize_output

Do NOT create a second competing graph for the same operation.

The main FailureOps application should call the LangGraph entrypoint.

Example conceptual API:

POST /api/v1/intelligence/analyze

Request:

{
"project_id": "...",
"organization_id": "...",
"query": "...",
"document_ids": [...],
"privacy_scope": "PRIVATE",
"include_global_opt_in": false,
"analysis_mode": "QUERY"
}

But:

FIRST inspect the actual RAG service schema.

If an existing compatible endpoint exists, use it.

Do not create a duplicate endpoint unnecessarily.

============================================================
12. REQUEST TYPES
=================

Support two major modes.

MODE A — USER QUESTION / RAG

User asks:

"What evidence indicates release risk?"

Flow:

FailureOps backend
→ LangGraph
→ retrieval
→ evidence
→ answer
→ citations
→ response

MODE B — AUTOMATIC PROJECT INTELLIGENCE

User uploads documents.

No question is required.

After ingestion/indexing becomes ready:

FailureOps backend
→ LangGraph project intelligence
→ inspect all allowed project documents
→ extract important metrics
→ events
→ claims
→ evidence
→ signals
→ risk dimensions
→ store structured intelligence

This is NOT the same as a user asking a question.

The automatic analysis should be explicitly triggered by:

* upload completion
* project analysis request
* scheduled/background job
  as appropriate.

Do not make users type a question just to obtain baseline project intelligence.

============================================================
13. AUTOMATIC PROJECT INTELLIGENCE
==================================

For automatic analysis, LangGraph should determine what is important from the
available project evidence.

Do not require the user to specify:

"find API latency"
"find bugs"
"find overtime"

Instead:

retrieve/analyze the allowed corpus
→ identify relevant measurable metrics
→ reconstruct time series
→ extract important evidence
→ extract events where actually present
→ extract claims where actually present
→ generate signals
→ calculate metric-aware risks

No hardcoded metric names.

Do not assume every project has the same metrics.

============================================================
14. WHAT MUST BE STORED
=======================

Do not store giant raw LLM prompts/responses as the canonical project state.

Store structured, necessary intelligence.

Recommended persistent objects:

Analysis
EvidenceItem
EventItem
ClaimItem
SignalItem
MetricSeries / metric observations where useful
SourceReference
RiskScoreResult
AnalysisRun metadata

Each should contain only useful structured data.

Preserve lineage:

analysis_id
project_id
organization_id
document_id
document_name
page/row/section
chunk_id
citation
confidence

============================================================
15. EVIDENCE PACKET CONTRACT
============================

The LangGraph service should return a structured EvidencePacket or equivalent
existing contract.

Minimum conceptual information:

project_id
analysis_id
organization_id
generated_at
evidence[]
conflicts
coverage
metrics

Evidence item must preserve:

id
category
evidence_type
statement
normalized_value
time_period
source
supporting_chunk_ids
confidence
verification_status
privacy

Do not send UI-only structures from the LangGraph service.

Use stable backend contracts.

============================================================
16. SIGNAL PACKET CONTRACT
==========================

LangGraph should return structured signal output.

Signals should include:

signal_id
name
category
signal_type
polarity
status
severity
summary
metric_change
signal_strength
signal_confidence
supporting_evidence_ids
supporting_relationship_ids

Also expose risk information separately and clearly.

Do not mix:
raw metric
risk score
metric change
risk change

These are different concepts.

============================================================
17. EVENTS AND CLAIMS
=====================

For narrative evidence:

EVENT:

deployment
release
outage
incident
milestone
rollout
state transition
etc.

CLAIM:

stakeholder opinion
customer statement
recommendation
belief
subjective observation

Pure telemetry is allowed to return:

events = []
claims = []

Do NOT fabricate events/claims from pure numeric data.

Every event/claim must carry source provenance.

============================================================
18. SOURCE PROVENANCE
=====================

This is REQUIRED.

For every result that can be shown to the user:

store and expose:

source_document_id
source_document_name
document_version where applicable
page_numbers
row numbers where applicable
section
sheet name where applicable
chunk_id
citation
confidence

Examples:

PDF:
Page 7

XLSX:
Sheet "Metrics", rows 20–30

CSV:
Rows 12–25

DOCX:
Section "Deployment Plan"

The UI should allow:

"Open source"

and resolve the actual original source through the main application/RustFS.

Do not invent page numbers.

============================================================
19. EVIDENCE INTELLIGENCE SCREEN
================================

The existing Evidence Intelligence screen should consume real LangGraph/RAG
results.

Existing UI pattern:

Sources
Conflicts
Citations
Stale

Keep the visual design.

Populate it from backend data.

Important:

"No completed analysis yet"
should be shown only when there genuinely isn't one.

After analysis:

show source counts
citation counts
conflicts
freshness/staleness if supported
evidence summaries

============================================================
20. ASK / EVIDENCE SCREEN
=========================

The existing Ask/Evidence screen should send a user question through the
main backend to LangGraph.

Flow:

User question
→ FailureOps backend
→ authorization/privacy calculation
→ LangGraph RAG
→ grounded answer
→ citations
→ evidence sources

The response must contain:

answer
confidence where available
supporting evidence
source documents
page/row references
analysis/request ID

If evidence is insufficient:

return an explicit insufficient-evidence result.

Do NOT hallucinate.

============================================================
21. CROSS-SOURCE RETRIEVAL
==========================

For a private project:

retrieve from authorized project/org data.

If global retrieval is enabled:

retrieve from:

* authorized private project data
* globally opted-in shared data

Never from another organization's private documents.

The UI should make it clear whether global knowledge was included.

Example:

Sources used:
Project documents: 8
Global opt-in sources: 3

Do not expose private global-source identity/content where policy forbids it.

============================================================
22. PIPELINE HEALTH SCREEN
==========================

The current Pipeline Health screen should show actual backend state.

Connect:

Documents
Chunks
Embeddings
Vector storage
Retrieval
Evidence Agent
Signal Agent

and any other stages that genuinely exist.

Do not animate fake progress.

Use:

pending
processing
ready
failed
not_started

with real timestamps/errors where available.

============================================================
23. TRUTH ENGINE
================

The Truth Engine is a DOWNSTREAM consumer of grounded evidence.

Flow:

User/team claim
↓
Main FailureOps backend
↓
retrieve relevant evidence
↓
LangGraph/RAG if needed
↓
collect cross-source evidence
↓
Truth Engine
↓
TRUE / FALSE / INSUFFICIENT EVIDENCE
↓
supporting proof
↓
actual conflicting evidence
↓
source citations

IMPORTANT PRIVACY RULE:

Truth Engine must respect the same privacy rules.

Do NOT automatically use global data just because it exists.

Global sources may only be used when the Truth Engine's policy allows them and
they are explicitly opted into the relevant scope.

For private claims, private project/org evidence is the default.

============================================================
24. TRUTH ENGINE OUTPUT
=======================

The UI should show:

Claim:
"We are losing deals because price is too high."

Verdict:
TRUE / FALSE / INSUFFICIENT EVIDENCE

Confidence:
X%

Evidence supporting:
...

Evidence contradicting:
...

What the evidence actually says:
...

Sources:
Document / page / section

If FALSE:
explicitly explain the evidence-supported alternative.

If TRUE:
show evidence supporting it.

If insufficient:
say what evidence is missing.

Do not invent a verdict when evidence is insufficient.

============================================================
25. FAILURE DNA
===============

The existing Failure DNA screen should consume the structured intelligence
returned by LangGraph/RAG.

It should not re-run RAG itself unless there is a deliberate reason.

Use:

signals
evidence
risk dimensions
events
claims
metrics

as inputs to the downstream Failure DNA engine.

============================================================
26. OTHER DOWNSTREAM FEATURES
=============================

Follow the same contract for:

Causal Analysis
Prediction
Historical Memory
What-If Simulation
Interventions
Experiments
Outcomes
Failure Radar

Pattern:

Main FailureOps backend
→ retrieve stored structured intelligence
→ invoke downstream engine
→ persist result
→ frontend renders result

Avoid re-retrieving/reprocessing the same documents unnecessarily.

============================================================
27. CACHING AND EFFICIENCY
==========================

Do not run a full LangGraph analysis on every page load.

Use:

analysis_id
project_id
document version/checksum
query hash where applicable
privacy scope
analysis mode

to identify reusable results.

Recommended behavior:

Upload document
→ process once

Project intelligence
→ run once after corpus changes

User question
→ run per query, optionally cache repeated identical requests

Page refresh
→ read persisted results

============================================================
28. IDEMPOTENCY
===============

Document ingestion must be idempotent.

Use checksum/hash to avoid accidentally indexing the same file repeatedly.

Analysis requests should have request IDs/idempotency keys where appropriate.

============================================================
29. VERSIONING
==============

Every persisted intelligence result should know:

analysis_id
pipeline/version if applicable
created_at
source document versions
risk-scoring version

This prevents confusion when scoring logic changes later.

============================================================
30. FAILURE HANDLING
====================

If LangGraph/RAG is unavailable:

Main app must return a clear service-unavailable state.

Do not fabricate a result.

The frontend should show:

"Intelligence service unavailable"

with retry where appropriate.

If only retrieval fails:

show retrieval/indexing error.

If LLM extraction fails:

preserve deterministic evidence when possible.

If one document is invalid:

do not lose the entire project corpus.

============================================================
31. TIMEOUTS
============

Set explicit service-to-service timeouts.

Do not allow a request to hang indefinitely.

For long-running analysis:

prefer:

POST → analysis_id / job ID
GET → status
GET → result

rather than holding a browser request for a long LLM workflow when not
necessary.

============================================================
32. OBSERVABILITY
=================

Every request should have correlation information:

request_id
analysis_id
project_id
organization_id

Log:

ingestion started
ingestion completed
retrieval started
retrieval completed
LangGraph started
node execution
LangGraph completed
downstream processing

Do NOT log:

* API keys
* passwords
* raw confidential document text
* sensitive private content unnecessarily

============================================================
33. FRONTEND UX IMPROVEMENTS
============================

Keep current design language.

Add where useful:

* processing status
* last analysis time
* source count
* global/private retrieval indicator
* analysis freshness
* retry button
* source drill-down
* evidence confidence
* "why this score?" explanation
* "why this verdict?" explanation
* analysis ID for support/debugging

Avoid clutter.

============================================================
34. API CONTRACT STRATEGY
=========================

The main application should expose stable API contracts.

Suggested conceptual categories:

/api/v1/projects/{project_id}/documents
/api/v1/projects/{project_id}/intelligence
/api/v1/projects/{project_id}/intelligence/{analysis_id}
/api/v1/projects/{project_id}/evidence/query
/api/v1/projects/{project_id}/truth/check

BUT:

FIRST inspect existing routes.

Reuse existing routes where possible.

Do not create duplicate endpoints.

The LangGraph service can remain internally versioned separately.

============================================================
35. DATA FLOW FOR UPLOAD
========================

Expected flow:

User uploads file
↓
Main FailureOps backend
↓
authorization
↓
optional metadata popup
↓
privacy selection
↓
RustFS object storage
↓
document DB record
↓
LangGraph/RAG ingestion API
↓
parser
↓
chunks
↓
embeddings
↓
vector index
↓
BM25 index
↓
ready
↓
automatic intelligence analysis
↓
EvidencePacket
↓
SignalPacket
↓
persist structured intelligence
↓
FailureOps downstream engines

============================================================
36. DATA FLOW FOR USER QUESTION
===============================

Expected flow:

User asks question
↓
Main backend validates project/user
↓
calculate allowed retrieval scope
↓
private/global filter
↓
LangGraph RAG endpoint
↓
retrieve
↓
rerank
↓
Evidence Agent
↓
structured grounded answer
↓
citations
↓
main backend
↓
frontend

============================================================
37. DATA FLOW FOR AUTOMATIC INTELLIGENCE
========================================

Expected flow:

Documents ready
↓
LangGraph project analysis
↓
retrieve/analyze authorized corpus
↓
time-series reconstruction
↓
Evidence
↓
Events
↓
Claims
↓
Signals
↓
Metric-aware risk
↓
structured result
↓
database
↓
FailureOps engines

No user query required.

============================================================
38. DATABASE DESIGN
===================

Audit existing models first.

Reuse existing tables/models where possible.

If new persistence is required, create proper migrations.

Do NOT create duplicate document tables unless necessary.

Recommended relational relationships:

Organization
↓
Project
↓
Document
↓
Analysis
├── EvidenceItem
├── EventItem
├── ClaimItem
└── SignalItem

All child records must retain organization/project scope.

============================================================
39. SECURITY TESTING
====================

Create automated tests for:

1. user A can access project A
2. user A cannot access project B
3. org A cannot access org B
4. private document cannot appear in global retrieval
5. global opt-in document can be used when policy permits
6. changing project_id in request does not bypass authorization
7. missing auth rejected
8. invalid service auth rejected
9. source access respects authorization
10. original document download respects authorization
11. event/claim provenance cannot cross tenants
12. cached analysis cannot cross tenants

============================================================
40. CORRECTNESS TESTING
=======================

Test:

* simple RAG question
* insufficient evidence
* multi-document retrieval
* duplicate documents
* metadata present
* metadata absent
* private-only retrieval
* global opt-in retrieval
* automatic project analysis
* pure telemetry → no fabricated events/claims
* narrative document → events/claims
* multi-chunk time series
* reverse/out-of-order rows
* metric-aware risk
* provenance page references
* source opening

============================================================
41. PERFORMANCE TESTING
=======================

Measure:

document ingestion latency
embedding latency
retrieval latency
reranking latency
LangGraph total latency
automatic project analysis time
query response time

Do not optimize prematurely.

Reuse indexed documents rather than re-parsing them for every request.

============================================================
42. FAILUREOPS FRONTEND SCREENS
===============================

Audit the current screens represented by the screenshots.

At minimum check:

1. Product registration
2. Evidence source configuration
3. Privacy configuration
4. Upload Evidence
5. Pipeline Health
6. Evidence Intelligence
7. Evidence Ask
8. Signal / intelligence output
9. Truth Engine
10. Downstream analysis screens

For EACH screen:

* determine whether it already exists
* determine whether backend data is real
* identify missing API
* connect existing UI if possible
* only create missing UI when genuinely necessary

DO NOT rebuild an existing screen.

============================================================
43. IMPORTANT: THE UI IS NOT THE SOURCE OF TRUTH
================================================

The backend response is authoritative.

Frontend must render:

* actual evidence
* actual signals
* actual events/claims
* actual risk scores
* actual provenance

Do not derive risk values in frontend.

Do not calculate percentage changes again in frontend if backend already provides
them.

============================================================
44. LANGGRAPH SHOULD REMAIN CENTRAL
===================================

Do not bypass LangGraph by directly calling individual EvidenceAgent or
SignalAgent functions from the main application.

The main application should call the LangGraph service entrypoint.

The LangGraph graph should orchestrate the intelligence flow.

Conceptually:

Main FailureOps
→ LangGraph API
→ compiled StateGraph
→ nodes
→ structured output

This keeps orchestration centralized and replaceable.

============================================================
45. CONTRACT ADAPTER
====================

If the current LangGraph API contract does not exactly match what the main
application needs:

create a thin adapter layer.

Do NOT modify the core RAG pipeline unnecessarily.

Adapter responsibilities:

* request mapping
* auth propagation
* privacy scope
* project metadata
* response validation
* retries/timeouts
* error normalization

Do not put business logic that belongs inside LangGraph into the main app
adapter.

============================================================
46. SCHEMA VALIDATION
=====================

Validate all cross-service responses.

Use strict schemas.

Reject malformed:

EvidencePacket
SignalPacket
EventItem
ClaimItem
RiskScoreResult

Do not let malformed LLM output propagate into downstream systems.

============================================================
47. SECURITY OF SOURCE DOCUMENTS
================================

Original documents live in RustFS.

A citation must reference a controlled source endpoint.

Example conceptual flow:

frontend asks:
"open evidence source"

↓
main backend verifies authorization

↓
backend generates authorized download/view URL

↓
RustFS object retrieval

Do not give unrestricted object-storage URLs.

============================================================
48. ADDITIONAL IDEA — ANALYSIS SNAPSHOT
=======================================

Implement an analysis snapshot/version concept if current architecture allows.

A user should be able to know:

Analysis:
A-123

Created:
2026-08-30

Documents:
5

Privacy scope:
Private + 3 global opt-in sources

Pipeline version:
...

Risk scoring version:
...

This makes downstream reproducibility much stronger.

============================================================
49. ADDITIONAL IDEA — FRESHNESS
===============================

Display:

Last analyzed:
...

Documents changed since analysis:
YES/NO

Analysis stale:
YES/NO

If a new document arrives:

mark project intelligence stale.

Do not silently show old analysis as current.

============================================================
50. ADDITIONAL IDEA — SOURCE-FIRST EXPLANATIONS
===============================================

For every major conclusion:

Conclusion
↓
Why
↓
Evidence
↓
Source
↓
Page/row
↓
Confidence

This should become the central UX principle of FailureOps.

============================================================
51. DO NOT HARD-CODE SCREENSHOT DATA
====================================

The screenshots are UX references only.

Never hardcode:

project names
company names
metrics
risk scores
documents
page numbers
claims
events
statuses

All data must come from backend state.

============================================================
52. DEVELOPMENT / PRODUCTION MODES
==================================

Support configuration such as:

LANGGRAPH_RAG_URL
LANGGRAPH_SERVICE_TOKEN
RAG_REQUEST_TIMEOUT
ENABLE_GLOBAL_OPT_IN
AUTO_ANALYSIS_ON_INGEST

Never put secrets in frontend code.

============================================================
53. IMPLEMENTATION ORDER
========================

Do not attempt everything at once.

Implement in this order:

PHASE 1
Repository audit

PHASE 2
Service-to-service authentication

PHASE 3
Document upload → LangGraph ingestion

PHASE 4
Document status/pipeline tracking

PHASE 5
User question → LangGraph RAG

PHASE 6
Evidence + provenance persistence

PHASE 7
Automatic project intelligence

PHASE 8
Signals/risk persistence

PHASE 9
Truth Engine integration

PHASE 10
Downstream FailureOps integration

PHASE 11
Global opt-in retrieval

PHASE 12
Performance + observability

Do not implement global retrieval by weakening private isolation.

============================================================
54. TEST WITH REAL DATA
=======================

Use real uploaded test documents.

At minimum verify:

PDF
CSV
XLSX
DOCX if supported

Use:

* a telemetry document
* a narrative document
* a customer-feedback document
* a multi-point time-series document

Verify:

metrics
events
claims
citations
pages/rows
signals
risk
privacy

============================================================
55. END-TO-END ACCEPTANCE TEST
==============================

Acceptance test:

A. Register a project.

B. Configure private evidence.

C. Upload documents.

D. Optional metadata can be entered.

E. Store originals in RustFS.

F. LangGraph/RAG processes them.

G. Pipeline UI updates using real state.

H. Run automatic project intelligence without entering a query.

I. Verify:

* evidence
* metrics
* events
* claims
* signals
* risk
* source citations

J. Ask a grounded question.

K. Receive evidence-backed answer.

L. Ask a question with insufficient evidence.

M. Receive insufficient-evidence result.

N. Use Truth Engine:
provide a claim
receive TRUE/FALSE/INSUFFICIENT
receive supporting/contradicting evidence
receive sources

O. Test private data.

P. Test global opt-in data.

Q. Confirm private data NEVER appears in another organization's global result.

R. Verify downstream FailureOps screens consume the same structured intelligence.

============================================================
56. REQUIRED DOCUMENTATION
==========================

Create/update integration documentation explaining:

MAIN APP
↓
API
↓
LANGGRAPH/RAG SERVICE
↓
RAG/LANGGRAPH
↓
STRUCTURED INTELLIGENCE

Document:

* architecture
* endpoints
* request schemas
* response schemas
* authentication
* privacy
* global opt-in
* upload lifecycle
* analysis lifecycle
* error handling
* local development
* production configuration
* testing

============================================================
57. FINAL DELIVERABLES
======================

After implementation provide:

1. AUDIT REPORT

2. ARCHITECTURE DIAGRAM

3. FILES CREATED

4. FILES MODIFIED

5. EXISTING FILES REUSED

6. API ENDPOINTS ADDED/REUSED

7. REQUEST/RESPONSE SCHEMAS

8. AUTHENTICATION FLOW

9. PRIVACY FLOW

10. GLOBAL OPT-IN FLOW

11. RUSTFS FLOW

12. DOCUMENT INGESTION FLOW

13. RAG QUERY FLOW

14. AUTOMATIC INTELLIGENCE FLOW

15. TRUTH ENGINE FLOW

16. DOWNSTREAM FAILUREOPS FLOW

17. DATABASE CHANGES

18. FRONTEND CHANGES

19. TESTS ADDED

20. SECURITY TEST RESULTS

21. END-TO-END TEST RESULTS

22. PERFORMANCE RESULTS

23. KNOWN LIMITATIONS

24. NEXT STEPS

============================================================
58. IMPORTANT: DO NOT CLAIM SUCCESS WITHOUT PROOF
=================================================

Do not say:

"fully integrated"
"production ready"
"complete"

unless you have actually demonstrated:

main frontend
→ main backend
→ LangGraph service
→ real RAG retrieval
→ real structured result
→ main backend persistence
→ frontend rendering

with a real end-to-end test.

============================================================
59. ASK QUESTIONS WHEN THERE IS A REAL BLOCKER
==============================================

If you discover an architectural ambiguity that cannot safely be resolved from:

* existing code
* existing schemas
* existing APIs
* existing screenshots
* existing configuration

STOP and ask a concise clarification question.

Do NOT invent behavior.

============================================================
60. FIRST RESPONSE
==================

Your FIRST response to this task should NOT be "implemented".

First report:

A. What already exists in main backend
B. What already exists in main frontend
C. What already exists in LangGraph/RAG
D. Which APIs can be reused immediately
E. Which APIs are missing
F. What exact integration architecture you recommend
G. Security/privacy risks discovered
H. Files you plan to modify
I. Files you plan to create
J. Any blocking questions

ONLY AFTER THE AUDIT SHOULD IMPLEMENTATION BEGIN.

============================================================
CORE PRINCIPLE
==============

The final system must behave like this:

USER
↓
FAILUREOPS FRONTEND
↓
FAILUREOPS BACKEND
↓
AUTH + PROJECT + PRIVACY SCOPE
↓
LANGGRAPH/RAG SERVICE
↓
RAG RETRIEVAL
↓
LANGGRAPH ORCHESTRATION
↓
EVIDENCE / EVENTS / CLAIMS / TIME-SERIES / SIGNALS / RISK
↓
STRUCTURED INTELLIGENCE
↓
FAILUREOPS BACKEND
↓
DATABASE / DOWNSTREAM ENGINES
↓
FRONTEND

The LangGraph/RAG layer is the intelligence core.

The main FailureOps application is the product and downstream decision layer.

Privacy boundaries must be enforced in the backend and retrieval layer.

Evidence and source provenance are first-class data.

No hardcoded demo behavior.

No fake outputs.

No cross-tenant leakage.

No duplicate RAG implementation.

============================================================
FINAL STOP CONDITION FOR THIS INITIAL AUDIT
===========================================

For now:

AUDIT FIRST.

DO NOT START LARGE-SCALE CODE CHANGES UNTIL THE AUDIT REPORT IS RETURNED.

After the audit report, we will approve the implementation phases.

````

### The most important architectural point

Your teammate should understand this distinction:

```text
Your LangGraph repo
       =
INTELLIGENCE ENGINE

Main FailureOps project
       =
PRODUCT + USER MANAGEMENT + SECURITY + DOWNSTREAM ENGINES
````

So when someone asks:

> “What is the evidence for this release risk?”

the flow should be:

```text
FailureOps UI
   ↓
Main backend
   ↓
"Is this user allowed to ask this?"
"Which project?"
"Private or global?"
   ↓
LangGraph service
   ↓
RAG retrieval
   ↓
Evidence Agent
   ↓
Signal / risk
   ↓
structured response
   ↓
Main backend
   ↓
UI
```

And for upload:

```text
Upload
 ↓
RustFS
 ↓
Document metadata
 ↓
LangGraph ingestion
 ↓
Parser
 ↓
Chunks
 ↓
Embeddings
 ↓
Vector + BM25
 ↓
Ready
 ↓
Automatic LangGraph analysis
 ↓
EvidencePacket
SignalPacket
Events
Claims
Risk
 ↓
DB
 ↓
FailureOps downstream engines
```

That architecture will save you from the integration problem you hit earlier, because **the two projects communicate through a small, explicit contract instead of trying to merge their internals**.


Exactly. **That is the architecture we should use**, and yes, I included the separate-service idea in the prompt, but I would make the port separation even more explicit so your teammate's agent cannot misunderstand it.

### Your deployment should be

```text
┌──────────────────────┐
│ FailureOps Frontend  │
│ React / Next / Vite  │
│ PORT: 5173           │
└──────────┬───────────┘
           │ HTTP
           ▼
┌──────────────────────┐
│ FailureOps Backend   │
│ FastAPI              │
│ PORT: 8000           │
└──────────┬───────────┘
           │ HTTP
           ▼
┌──────────────────────────────┐
│ LangGraph / RAG Intelligence │
│ FastAPI + LangGraph          │
│ PORT: 8001                   │
└──────────┬───────────────────┘
           │
           ├──────────────► PostgreSQL
           │                 PORT: 5432
           │
           └──────────────► RustFS
                             API PORT: 9000
                             Console: 9001
```

The exact port numbers can be changed, but **the services remain separate**.

So the important rule is:

```text
Frontend ≠ Backend ≠ LangGraph/RAG ≠ PostgreSQL ≠ RustFS
```

The frontend should **not** directly talk to PostgreSQL or LangGraph internals.

The normal request path is:

```text
Browser
  ↓
Frontend
  ↓
FailureOps Backend
  ↓
LangGraph/RAG Service
  ↓
PostgreSQL / RustFS
```

### Add this clarification to the agent prompt

Give your teammate this addendum:

```text
IMPORTANT DEPLOYMENT / PORT ARCHITECTURE

The system MUST remain split into independently running services.

1. FAILUREOPS FRONTEND
   - Runs on its own port
   - Example: 5173
   - Browser-facing
   - Talks to the FailureOps backend only

2. FAILUREOPS BACKEND
   - Runs on a separate port
   - Example: 8000
   - Owns authentication, authorization, projects, organizations,
     privacy policy, downstream FailureOps engines, and frontend-facing APIs
   - Calls the LangGraph/RAG service over HTTP

3. LANGGRAPH / RAG INTELLIGENCE SERVICE
   - Runs on a separate port
   - Example: 8001
   - Owns RAG ingestion, retrieval, LangGraph orchestration, Evidence Agent,
     Events, Claims, Time-Series Engine, Signal Agent, and Metric-Aware Risk
   - Must be independently startable/deployable
   - Main FailureOps backend communicates with it through versioned HTTP APIs

4. POSTGRESQL
   - Separate database service
   - Example: 5432
   - Never exposed directly to the browser
   - Credentials must remain server-side

5. RUSTFS / OBJECT STORAGE
   - Separate object-storage service
   - Example: API 9000 / console 9001
   - Browser must not receive unrestricted storage credentials
   - Main backend controls authorized document access

CONFIGURATION MUST BE ENVIRONMENT-BASED:

FAILUREOPS_FRONTEND_URL=...
FAILUREOPS_BACKEND_URL=...
LANGGRAPH_RAG_URL=...
DATABASE_URL=...
RUSTFS_ENDPOINT=...
RUSTFS_ACCESS_KEY=...
RUSTFS_SECRET_KEY=...

DO NOT HARDCODE LOCALHOST OR PORT NUMBERS IN APPLICATION LOGIC.

SERVICE CALL FLOW:

Frontend
    ↓
FailureOps Backend
    ↓ HTTP
LangGraph/RAG Service
    ↓
PostgreSQL / RustFS

NEVER:

Frontend
    ↓
PostgreSQL

Frontend
    ↓
RustFS with admin credentials

Frontend
    ↓
LangGraph internal nodes directly

The LangGraph service must expose a stable service/API boundary.
The main backend must consume the contract, not import LangGraph source code.

All services must be independently runnable for local development and
independently deployable for production.
```

### Why this is actually better

Think of it like a college campus:

```text
Frontend = reception desk
Backend = administration office
LangGraph = intelligence/research lab
PostgreSQL = records room
RustFS = document warehouse
```

The reception desk doesn't walk into the records room and grab files itself.

That separation is especially important for your **private/global evidence model** because the backend can decide:

```text
Who is this user?
        ↓
Which company?
        ↓
Which project?
        ↓
Private only?
        ↓
Global opt-in allowed?
        ↓
What scope can LangGraph search?
```

Then LangGraph gets a **trusted retrieval scope**, rather than blindly trusting a browser request.

So yes: **three application ports + database + object storage as separate services is the correct architecture for what you're building**, and I'd use the clarification above in addition to the big integration prompt.