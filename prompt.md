MASTER PROMPT — FIX REAL DOCUMENT → RAG → LANGGRAPH → PGVECTOR/DB → EVIDENCE + SIGNALS

PROJECT:
FAILUREOPS X — Project Failure Intelligence

CRITICAL CURRENT PROBLEM
========================

The frontend project currently does NOT reliably show real intelligence from
the documents uploaded by the user.

Observed behavior:

- User uploads documents from the project frontend.
- The document may appear as uploaded/ready.
- But the uploaded document's actual content is not reliably reaching the
  real RAG retrieval pipeline.
- Evidence Intelligence does not consistently show evidence extracted from
  the uploaded files.
- Signal Explorer does not consistently show signals generated from the
  uploaded files.
- Some screens show stale/duplicate/mock-looking data.
- We need the REAL uploaded document content to flow through the complete
  ingestion + RAG + LangGraph pipeline and be persisted in PostgreSQL and
  pgvector.
- The frontend must then read the real persisted results.

IMPORTANT:
DO NOT TRUST THE PREVIOUS AUDIT REPORT.
DO NOT ASSUME THE RAG WORKS JUST BECAUSE AN ENDPOINT EXISTS.
DO NOT ASSUME "READY", "RAG REACHABLE", "LANGGRAPH COMPLETE", OR
"EMBEDDED" MEANS THE CURRENT USER UPLOAD ACTUALLY REACHED THAT PIPELINE.

THIS TASK MUST PROVE THE REAL LIVE PROJECT FLOW.

============================================================
1. REQUIRED TARGET ARCHITECTURE
============================================================

The final working architecture must be:

USER
 ↓
FRONTEND
 ↓
BACKEND API
 ↓
DOCUMENT INGESTION
 ↓
RUSTFS / OBJECT STORAGE
 ↓
PARSER
 ↓
DOCUMENT BLOCKS
 ↓
CHUNKING
 ↓
EMBEDDING
 ↓
POSTGRESQL + PGVECTOR
 ↓
REAL RETRIEVAL
 ↓
BM25 + DENSE + RRF + RERANK
 ↓
LANGGRAPH
 ↓
EVIDENCE AGENT
 ↓
VALIDATED EVIDENCE
 ↓
SIGNAL AGENT
 ↓
VALIDATED SIGNALS
 ↓
PERSIST TO DB
 ↓
FRONTEND API
 ↓
EVIDENCE INTELLIGENCE
 ↓
SIGNAL EXPLORER

DO NOT bypass this chain.

============================================================
2. FIRST — FORENSIC AUDIT ONLY
============================================================

Before changing code, inspect the complete repository.

Trace the REAL runtime path for a project upload.

Inspect:

FRONTEND
- upload page
- file picker
- upload API client
- project ID handling
- organization ID handling
- metadata handling
- upload request payload
- upload response handling
- polling/status logic

BACKEND
- document upload endpoint
- ingest service
- parser
- chunker
- embedding service
- retrieval service
- LangGraph entrypoint
- Evidence Agent
- Signal Agent
- persistence

DATABASE
- documents
- document_blocks
- chunks
- embeddings / vector column
- evidence
- signals
- analysis
- jobs
- provenance

RUSTFS
- object upload
- storage key/path
- document original path

Do NOT modify code yet.

============================================================
3. FIND THE EXACT BREAK
============================================================

We need to identify where this chain currently breaks:

UPLOAD
→ DATABASE
→ RUSTFS
→ PARSER
→ CHUNKS
→ PGVECTOR
→ RETRIEVAL
→ LANGGRAPH
→ EVIDENCE
→ SIGNAL
→ DATABASE
→ FRONTEND

For every arrow report:

PASS / FAIL

Example:

Upload → Document row        PASS
Document → RustFS            PASS
Document → Parser            FAIL
Parser → Chunks              PASS
Chunks → pgvector            FAIL
pgvector → Retrieval        FAIL
Retrieval → LangGraph        PASS
LangGraph → Evidence        PASS
Evidence → DB               FAIL
DB → Evidence UI            PASS

Do not proceed without finding the actual break.

============================================================
4. USE A BRAND-NEW UNIQUE TEST DOCUMENT
============================================================

Create a fresh file through the USER-FACING PROJECT UPLOAD UI.

Do not reuse existing database records.

Create:

failureops_live_rag_test.txt

with this exact unique content:

FAILUREOPS_LIVE_RAG_TOKEN_928374

Project incident:
The Atlas billing service experienced exactly 23 payment timeout failures
on 2026-08-31 after release version LIVE-RAG-23.

This exact token and incident do not exist anywhere else.

IMPORTANT:

The test MUST use the frontend upload flow.

Do not insert directly into PostgreSQL.

Do not manually create chunks.

Do not manually create embeddings.

Do not insert evidence manually.

We are testing the real application.

============================================================
5. VERIFY DOCUMENT CREATION
============================================================

After frontend upload:

verify database:

documents

Must contain:

document_id
project_id
organization_id
filename
size
status
storage reference
metadata

Confirm the project_id is the current project.

Confirm organization_id is correct.

============================================================
6. VERIFY RUSTFS
============================================================

Verify the actual uploaded file exists in RustFS/object storage.

Confirm:

document_id
→ storage object
→ correct uploaded file

Download/view the object through the backend authorization path.

The object must contain:

FAILUREOPS_LIVE_RAG_TOKEN_928374

If not:

UPLOAD/STORAGE IS BROKEN.

============================================================
7. VERIFY PARSER
============================================================

Find actual parser output.

Verify:

failureops_live_rag_test.txt

was parsed.

Search parsed content for:

FAILUREOPS_LIVE_RAG_TOKEN_928374

This exact token MUST exist.

If it does not:

PARSER/INGESTION IS BROKEN.

Do not continue by faking the text.

============================================================
8. VERIFY DOCUMENT BLOCKS
============================================================

Inspect document_blocks or equivalent parsed representation.

Confirm:

document_id
text
page/location
ordering

and verify the unique token exists.

============================================================
9. VERIFY CHUNKING
============================================================

Inspect chunks table.

Confirm at least one chunk belongs to:

failureops_live_rag_test.txt

and contains:

FAILUREOPS_LIVE_RAG_TOKEN_928374

Record:

chunk_id
document_id
content
chunk_index
metadata

============================================================
10. VERIFY PGVECTOR EMBEDDING
============================================================

Confirm the chunk has a REAL vector embedding.

Verify:

embedding is not NULL
dimension is correct
vector belongs to correct chunk
chunk belongs to correct document
document belongs to correct project

If current configured dimension is 2048:

verify actual vector dimension is 2048.

Do NOT merely rely on a frontend "Embedded" status.

Inspect PostgreSQL directly through the application's normal database layer.

============================================================
11. VERIFY VECTOR SEARCH
============================================================

Now ask through the REAL application query interface:

"What happened to the Atlas billing service after release LIVE-RAG-23?"

Run this through the normal user-facing question flow.

Inspect backend retrieval.

The test chunk MUST appear.

Record:

query
document_id
chunk_id
retrieval score
rank

If the chunk is not retrieved:

RAG retrieval is broken.

============================================================
12. VERIFY PROJECT FILTERING
============================================================

The retrieval query MUST include project scope.

At minimum:

organization_id
project_id

Do not allow:

SELECT chunks
without tenant/project filtering.

Ensure private project documents cannot be retrieved by another project.

============================================================
13. VERIFY DENSE RETRIEVAL
============================================================

Confirm the actual query embedding is generated.

Confirm pgvector search is executed.

Confirm the unique test chunk is among candidates.

============================================================
14. VERIFY BM25
============================================================

If BM25 is part of the existing RAG architecture:

verify the exact test document can be found through lexical retrieval.

============================================================
15. VERIFY RRF
============================================================

If RRF is used:

verify:

dense results
+
BM25 results
↓
RRF
↓
final candidate ranking

Do not label the system "hybrid" unless this actually occurs at runtime.

============================================================
16. VERIFY RERANKER
============================================================

If reranking is configured:

verify real candidates reach the reranker.

Verify final ranking.

Do not create another reranking implementation.

============================================================
17. VERIFY LANGGRAPH ENTRY
============================================================

The retrieved test chunk must enter the LangGraph state.

Inspect actual graph state/job.

The graph must receive:

query
project_id
organization_id
retrieved_chunks

The retrieved chunk must contain:

FAILUREOPS_LIVE_RAG_TOKEN_928374

============================================================
18. VERIFY EVERY LANGGRAPH NODE
============================================================

Verify the real execution of the existing graph.

At minimum:

validate_request
retrieve_evidence
evidence_agent
validate_evidence
signal_agent
validate_signals
finalize_output

Record:

node name
status
execution time
input/output summary

Do not use frontend progress animations as evidence.

============================================================
19. VERIFY EVIDENCE AGENT
============================================================

The Evidence Agent must extract the real incident.

Expected information:

Event:
Atlas billing service experienced 23 payment timeout failures.

Date:
2026-08-31

Release:
LIVE-RAG-23

Token:
FAILUREOPS_LIVE_RAG_TOKEN_928374

The exact values must come from the uploaded document.

============================================================
20. VERIFY EVIDENCE VALIDATION
============================================================

The evidence validation stage must retain:

evidence_id
document_id
chunk_id
source_document_name
location
confidence
statement

The source must be:

failureops_live_rag_test.txt

NOT some older fintech/demo document.

============================================================
21. VERIFY SIGNAL AGENT
============================================================

The Signal Agent must process the real evidence.

Inspect the created signals.

Every signal must reference the proper evidence.

Example relationship:

Signal
 ↓
Evidence ID
 ↓
Chunk ID
 ↓
Document ID
 ↓
failureops_live_rag_test.txt

============================================================
22. VERIFY PERSISTENCE
============================================================

After analysis, inspect the real database.

Confirm records exist for:

analysis
evidence
events where applicable
claims where applicable
metrics where applicable
signals
provenance

All records must have correct:

organization_id
project_id

============================================================
23. VERIFY FRONTEND EVIDENCE INTELLIGENCE
============================================================

Now open:

/projects/{project_id}/evidence

The UI MUST show evidence from:

failureops_live_rag_test.txt

It must not show only older seeded/demo records.

Display:

CORE FINDING
Atlas billing service experienced 23 payment timeout failures after
release LIVE-RAG-23.

SOURCE
failureops_live_rag_test.txt

LOCATION
<actual location>

CONFIDENCE
<real backend value>

EVIDENCE ID
<real ID>

SUPPORTING CHUNK
<real chunk relationship>

No mock fallback.

============================================================
24. VERIFY SIGNAL EXPLORER
============================================================

Open:

/projects/{project_id}/signals

Signals generated from the new document MUST appear.

Each signal should show:

signal title
dimension/category
severity/risk
trend if applicable
strength/confidence
supporting evidence
source

The new signal must reference the same evidence created by LangGraph.

============================================================
25. IMPORTANT — FRONTEND MUST NOT INVENT DATA
============================================================

Search frontend for:

mock
demo
sample
fixture
hardcoded
fallback
seed

Especially:

Evidence Intelligence
Signal Explorer

If API fails, do NOT populate the screen using demo data.

Show:

Unable to load evidence

or:

No verified evidence available.

Do not silently use stale sample data.

============================================================
26. FIX DUPLICATE EVIDENCE ROOT CAUSE
============================================================

Current issue:

The same evidence appears multiple times.

Example:

"9. Current Product Assumptions"
fintech.pdf
Page 5

appears repeatedly.

Find the actual root cause.

Possible:

duplicate DB inserts
bad SQL join
repeated LangGraph persistence
multiple chunks mapped to one evidence item
frontend duplication
repeated API requests

Fix at the correct layer.

Canonical evidence identity should remain stable.

Do NOT simply hide duplicates using CSS.

Do NOT deduplicate by filename only.

Do NOT deduplicate by title only.

============================================================
27. PRESERVE DISTINCT EVIDENCE
============================================================

Two separate facts from the same document/page may be legitimate.

Therefore:

same filename ≠ same evidence

same page ≠ same evidence

Use authoritative evidence_id or deterministic canonical identity.

============================================================
28. FULL DATA CONTRACT
============================================================

Do not reduce backend evidence to:

title
+
filename
+
page

Preserve all useful structured fields.

At minimum, where available:

evidence_id
analysis_id
project_id
organization_id

type
category

statement
summary
details

metric
canonical_name
value
unit

baseline
previous
current
dates

trend
changes

risk
severity
confidence

source_document_id
source_document_name

page_numbers
row_numbers
sheet_name
section_name

chunk_ids
supporting_excerpt

citation

Do not invent fields that do not exist.

============================================================
29. METRIC EVIDENCE
============================================================

For telemetry documents, preserve:

baseline
previous
current
total change
period change
trend
risk
severity

Do not render the entire CSV row as one giant string.

============================================================
30. EVENTS
============================================================

For real events:

show:

event type
description
date/time
entity
source
location
confidence

Only if actually extracted.

============================================================
31. CLAIMS
============================================================

For claims:

show:

statement
claim type
entity/speaker if available
source
location
confidence

Only if actually available.

============================================================
32. SOURCE PROVENANCE
============================================================

Every evidence item must be traceable:

Evidence ID
 ↓
Chunk ID
 ↓
Document ID
 ↓
Source file
 ↓
Page/row/sheet/location

The user must be able to prove where the answer came from.

============================================================
33. OPEN SOURCE
============================================================

"Open Source" must resolve:

document_id
 ↓
authorized backend download/stream endpoint
 ↓
RustFS
 ↓
actual uploaded document

Do not construct URLs from filenames.

Do not expose RustFS credentials.

Test with the new:

failureops_live_rag_test.txt

file.

============================================================
34. EVIDENCE DETAIL DRAWER
============================================================

Click one evidence card.

The drawer must display real structured detail.

Example:

CORE FINDING

Atlas billing service experienced exactly 23 payment timeout failures
after release LIVE-RAG-23.

KEY FACTS

23 timeout failures
2026-08-31
Release: LIVE-RAG-23

SOURCE

failureops_live_rag_test.txt

LOCATION

<actual>

CONFIDENCE

<actual>

SUPPORTING EXCERPT

<actual retrieved text>

TECHNICAL DETAILS ▼

Evidence ID
Analysis ID
Document ID
Chunk ID

[Open Source]

Do not show generic filler text if actual evidence exists.

============================================================
35. SIGNAL → EVIDENCE
============================================================

Clicking a signal should allow:

Signal
 ↓
Supporting evidence
 ↓
Evidence detail
 ↓
Actual source document

This relationship must use IDs, not copied strings.

============================================================
36. NO STALE DATA
============================================================

After uploading the unique test document:

refresh the page.

The evidence MUST still exist.

Run another query.

The new evidence MUST remain available.

Restart backend if practical.

Data must remain persisted in PostgreSQL.

Do not depend on frontend memory.

============================================================
37. NO MOCK FALLBACK
============================================================

Critical rule:

If the real backend returns:

0 evidence

the UI must show:

No verified evidence found.

It must NOT display:

fintech.pdf
old demo evidence
seeded signals
sample predictions

============================================================
38. ANALYSIS SCOPING
============================================================

Every analysis must identify:

organization_id
project_id

Every retrieval query must enforce them.

Every persisted evidence/signal record must contain them.

============================================================
39. PRIVACY
============================================================

Private project:

only authorized project users can retrieve its evidence.

Global/opt-in knowledge:

only approved anonymized global information can participate.

Never use another company's private document to answer.

This rule applies to:

retrieval
LangGraph
evidence
signals
frontend

============================================================
40. MULTI-DOCUMENT UPLOAD
============================================================

The application must support uploading multiple documents.

Do not create:

one LangGraph request per tiny chunk.

Do not create uncontrolled parallel LLM calls.

Use the existing ingestion pipeline.

Process documents/chunks in controlled batches.

============================================================
41. RATE LIMITING
============================================================

Earlier we experienced HTTP 429.

Inspect:

LLM concurrency
embedding concurrency
reranking concurrency
retry behavior

Do not use unlimited Promise.all / gather for LLM calls.

Use controlled concurrency.

Reuse the existing KeyRotationManager/rate-limit strategy if present.

Do not add needless LLM calls for frontend rendering.

============================================================
42. ANALYSIS JOB BEHAVIOR
============================================================

One user analysis should produce one canonical analysis job.

Do not rerun LangGraph whenever:

Evidence page opens
Signal page opens
DNA page opens
Radar page opens
Prediction page opens

Downstream screens should read persisted results.

============================================================
43. DATABASE AS SOURCE OF TRUTH
============================================================

After LangGraph completes:

persist the canonical intelligence result.

Frontend must retrieve persisted data.

Do not make frontend directly call the LLM.

Do not make frontend directly query pgvector.

============================================================
44. PGVECTOR AS SOURCE OF RETRIEVAL
============================================================

Uploaded document chunks MUST be persisted with embeddings.

Retrieval MUST query pgvector for the current project/tenant.

Do not use only in-memory arrays.

Do not use static JSON.

Do not use frontend memory.

============================================================
45. TEST WITH A COMPLETELY NEW FACT
============================================================

The strongest test is:

Upload:

failureops_live_rag_test.txt

Then ask:

"What happened to the Atlas billing service after release LIVE-RAG-23?"

The answer must mention:

23 payment timeout failures
2026-08-31
LIVE-RAG-23

Then ask:

"What is FAILUREOPS_LIVE_RAG_TOKEN_928374?"

The answer must identify the unique token.

Then perform a query from another project.

It must NOT retrieve the document.

============================================================
46. NEGATIVE TEST
============================================================

Remove the test document from retrieval scope.

Ask:

"What happened to the Atlas billing service after release LIVE-RAG-23?"

Expected:

No relevant evidence found.

NOT:

the previous answer from cache/mock data.

This proves retrieval is the actual source of the answer.

============================================================
47. FRONTEND NETWORK VERIFICATION
============================================================

Open browser DevTools.

For:

Evidence Intelligence

record:

request URL
response status
response JSON

For:

Signal Explorer

record:

request URL
response status
response JSON

Verify the response contains:

document_id
evidence_id
source
signals

and is NOT static frontend data.

============================================================
48. DATA COMPARISON
============================================================

Compare:

LANGGRAPH OUTPUT
vs
DB
vs
API
vs
FRONTEND

Use this table:

| Field | LangGraph | DB | API | UI |
|---|---|---|---|---|
| Document | | | | |
| Document ID | | | | |
| Chunk | | | | |
| Evidence ID | | | | |
| Statement | | | | |
| Source | | | | |
| Location | | | | |
| Confidence | | | | |
| Signal | | | | |
| Risk | | | | |

Every important field must survive the chain.

============================================================
49. IF RAG IS ALREADY FUNCTIONAL
============================================================

If the backend RAG works correctly but the project's frontend is not
connected:

DO NOT rewrite RAG.

Fix:

frontend upload contract
backend integration
API mapping
persistence
frontend consumption

Use the existing RAG/LangGraph implementation.

============================================================
50. IF UPLOAD BYPASSES RAG
============================================================

If the project's upload route currently stores files but does not call the
real ingestion service:

FIX IT.

Correct:

Frontend
→ /api/documents/upload
→ actual ingest_upload
→ RustFS
→ parser
→ chunks
→ embeddings
→ pgvector

Do not create a second ingestion pipeline.

============================================================
51. IF ANALYSIS BYPASSES LANGGRAPH
============================================================

If project analysis currently generates data without calling the real graph:

FIX IT.

The analysis flow must call the existing canonical LangGraph workflow.

Do not reproduce LangGraph logic in another service.

============================================================
52. IF FRONTEND USES MOCK DATA
============================================================

Remove production use of the mock data.

Keep legitimate test fixtures in test-only locations.

Production pages must consume the live APIs.

============================================================
53. IF DB IS NOT SAVING EVIDENCE
============================================================

Implement proper persistence using the existing database architecture.

Do not store critical intelligence only in memory.

Use:

analysis
evidence
signals
provenance

and existing models where available.

============================================================
54. IF PGVECTOR IS NOT RECEIVING CHUNKS
============================================================

Fix the embedding persistence path.

Confirm:

chunk
→ embedding
→ pgvector

Do not make retrieval read raw documents directly as a replacement.

============================================================
55. DO NOT BREAK EXISTING WORKING RAG
============================================================

Preserve:

- parser
- chunking
- embeddings
- pgvector
- BM25
- RRF
- reranking
- LangGraph
- Evidence Agent
- Signal Agent

Reuse existing services.

Do not create:

RAGV2
LangGraphV2
EvidenceServiceV2

unless the audit proves an existing implementation is unusable.

============================================================
56. TEST SUITE
============================================================

Add integration tests for:

1. frontend/backend upload contract
2. document persistence
3. parser
4. chunks
5. embeddings
6. pgvector retrieval
7. BM25 retrieval
8. hybrid retrieval
9. LangGraph execution
10. evidence extraction
11. evidence persistence
12. signal generation
13. signal persistence
14. frontend evidence API
15. frontend signal API
16. provenance
17. source opening
18. project isolation
19. tenant isolation
20. no-mock production behavior

============================================================
57. GOLDEN END-TO-END TEST
============================================================

Create an automated golden test equivalent to:

UPLOAD
↓
PARSE
↓
CHUNK
↓
EMBED
↓
PGVECTOR
↓
RETRIEVE
↓
LANGGRAPH
↓
EVIDENCE
↓
SIGNAL
↓
PERSIST
↓
API
↓
UI

Use the unique token:

FAILUREOPS_LIVE_RAG_TOKEN_928374

The test must fail if any stage does not work.

============================================================
58. FINAL ACCEPTANCE CRITERIA
============================================================

The fix is complete ONLY if all are true:

✓ User uploads a NEW document from the frontend

✓ Document is persisted in DB

✓ Document is stored in RustFS

✓ Parser extracts the real content

✓ Chunks contain the real content

✓ Embeddings are persisted in pgvector

✓ Retrieval finds the uploaded chunk

✓ Project/tenant filtering is enforced

✓ LangGraph receives retrieved chunks

✓ Evidence Agent extracts the real fact

✓ Signal Agent generates signals from real evidence

✓ Evidence is persisted

✓ Signals are persisted

✓ Evidence Intelligence displays the uploaded document's evidence

✓ Signal Explorer displays signals from that evidence

✓ Evidence links use real evidence IDs

✓ Source links open the real uploaded file

✓ Duplicate evidence is not created/rendered

✓ No production mock fallback is used

✓ Data survives page refresh

✓ Data survives backend restart where persistence is expected

✓ No cross-project leakage

✓ No API keys/secrets are exposed

✓ No uncontrolled LLM parallelism

✓ No unnecessary repeated LangGraph executions

============================================================
59. REQUIRED FINAL REPORT
============================================================

Return a detailed report:

====================================================
FAILUREOPS X — LIVE RAG/LANGGRAPH INTEGRATION REPORT
====================================================

1. EXECUTIVE VERDICT

Real frontend → RAG:
PASS/FAIL

Real RAG → LangGraph:
PASS/FAIL

Real LangGraph → Evidence:
PASS/FAIL

Real Evidence → Signals:
PASS/FAIL

Real persistence:
PASS/FAIL

Frontend live data:
PASS/FAIL

Overall:
PASS/PARTIAL/FAIL

----------------------------------------------------

2. EXACT ROOT CAUSE

<precise cause>

----------------------------------------------------

3. PIPELINE TRACE

Upload:
...

RustFS:
...

Parser:
...

Chunks:
...

Embedding:
...

PGVector:
...

Dense retrieval:
...

BM25:
...

RRF:
...

Reranker:
...

LangGraph:
...

Evidence:
...

Signals:
...

DB persistence:
...

Frontend:
...

----------------------------------------------------

4. UNIQUE TEST PROOF

Document:
failureops_live_rag_test.txt

Token:
FAILUREOPS_LIVE_RAG_TOKEN_928374

Document ID:
...

Chunk ID:
...

Vector:
...

Retrieved:
YES/NO

LangGraph:
YES/NO

Evidence ID:
...

Signal ID:
...

Frontend:
YES/NO

Source:
HTTP ...

----------------------------------------------------

5. DUPLICATION ROOT CAUSE

...

----------------------------------------------------

6. MOCK DATA AUDIT

Evidence Intelligence:
REAL/MOCK/MIXED

Signal Explorer:
REAL/MOCK/MIXED

----------------------------------------------------

7. FILES CHANGED

...

----------------------------------------------------

8. DATABASE CHANGES

...

----------------------------------------------------

9. API CHANGES

...

----------------------------------------------------

10. LANGGRAPH CHANGES

...

----------------------------------------------------

11. TESTS

...

----------------------------------------------------

12. SECURITY

Project isolation:
PASS/FAIL

Tenant isolation:
PASS/FAIL

Source authorization:
PASS/FAIL

----------------------------------------------------

13. PERFORMANCE

LLM calls:
...

Embedding calls:
...

Retrieval latency:
...

Rate-limit protection:
...

----------------------------------------------------

14. LIVE BROWSER RESULT

Upload:
PASS/FAIL

Evidence Intelligence:
PASS/FAIL

Signal Explorer:
PASS/FAIL

Evidence detail:
PASS/FAIL

Open Source:
PASS/FAIL

----------------------------------------------------

15. REMAINING LIMITATIONS

...

============================================================
FINAL RULE
============================================================

DO NOT SAY "RAG WORKS" BECAUSE AN ENDPOINT EXISTS.

PROVE:

REAL USER UPLOAD
→ REAL STORAGE
→ REAL PARSING
→ REAL CHUNKS
→ REAL PGVECTOR
→ REAL RETRIEVAL
→ REAL LANGGRAPH
→ REAL EVIDENCE
→ REAL SIGNALS
→ REAL DATABASE
→ REAL FRONTEND

The uploaded document itself must be the source of the displayed evidence.

No mock values.
No seeded fallback.
No fake citations.
No fabricated evidence.
No hardcoded signals.

FIRST AUDIT THE ACTUAL LIVE PATH.
THEN FIX ONLY THE BROKEN PARTS.
THEN RUN THE UNIQUE-TOKEN END-TO-END TEST.
THEN REPORT THE PROOF.

DO NOT START BY REDESIGNING THE UI.
DO NOT REWRITE THE RAG ENGINE UNTIL THE AUDIT PROVES IT IS BROKEN.