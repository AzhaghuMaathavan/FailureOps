MASTER PROMPT — FIX EVIDENCE INTELLIGENCE DATA LOSS + DUPLICATION

PROJECT:
FAILUREOPS X — PROJECT FAILURE INTELLIGENCE

REFERENCE:
The existing LangGraph/RAG implementation already produces rich, detailed
structured intelligence.

I have compared:

1. THE REFERENCE / LANGGRAPH OUTPUT
   → detailed extracted information
   → multiple fields
   → real source provenance
   → real metric values
   → dates
   → events/claims where applicable
   → evidence
   → confidence
   → source locations

2. CURRENT FAILUREOPS EVIDENCE INTELLIGENCE UI
   → duplicate evidence cards
   → same document/evidence repeated multiple times
   → very little information shown
   → large portions of LangGraph output are being dropped
   → evidence detail drawer/modal is too sparse
   → source/provenance exists but is not represented completely

GOAL:

Make FailureOps display the REAL, DETAILED LangGraph/RAG intelligence that is
already being produced.

DO NOT create fake detail.

DO NOT hardcode example data.

DO NOT duplicate the LangGraph pipeline.

DO NOT redesign the backend intelligence if it already works.

Find where the rich LangGraph response is being transformed into an incomplete
frontend object and FIX THAT DATA LOSS.

============================================================
1. FIRST — FORENSIC AUDIT
============================================================

Before changing code, inspect the complete data path:

DOCUMENT
→ PARSER
→ CHUNK
→ RAG RETRIEVAL
→ LANGGRAPH
→ EVIDENCE AGENT
→ STRUCTURED EVIDENCE
→ DATABASE
→ API
→ FRONTEND API CLIENT
→ TYPES
→ EVIDENCE INTELLIGENCE PAGE
→ EVIDENCE DETAIL DRAWER

Identify exactly where information is lost.

Inspect:

- LangGraph state
- final graph output
- evidence schema
- evidence DB model
- evidence persistence
- evidence API response
- frontend TypeScript interface
- API transformation/mapping
- deduplication logic
- Evidence Intelligence list
- Evidence detail drawer/modal

DO NOT PATCH THE UI FIRST.

Report:

DATA LOSS POINT:
<exact file/function>

DUPLICATION POINT:
<exact file/function>

============================================================
2. REFERENCE THE REAL LANGGRAPH OUTPUT
============================================================

Use the real existing LangGraph output as the authoritative source.

The frontend must not reconstruct intelligence from:

- filename
- raw chunk text
- category
- evidence ID alone

Instead, consume the structured evidence fields returned by the backend.

Compare the actual backend response against the frontend model.

Create a field mapping:

BACKEND FIELD
→ FRONTEND FIELD

Example:

evidence.statement
→ evidence.statement

evidence.source_document_id
→ evidence.sourceDocumentId

evidence.source_document_name
→ evidence.sourceDocumentName

evidence.page_numbers
→ evidence.pageNumbers

evidence.supporting_chunk_ids
→ evidence.supportingChunkIds

evidence.confidence
→ evidence.confidence

evidence.metric
→ evidence.metric

etc.

Do not silently discard fields.

============================================================
3. PRESERVE THE FULL EVIDENCE OBJECT
============================================================

The current frontend appears to reduce rich evidence into something like:

title
+
filename
+
page
+
confidence

That is NOT sufficient.

Preserve the full structured evidence returned by LangGraph.

Depending on the actual schema, retain fields such as:

evidence_id
analysis_id
project_id

evidence_type
category
subcategory

core_statement
summary
details
key_facts

metric
canonical_name
value
unit

baseline_value
previous_value
current_value

baseline_date
previous_date
current_date

baseline_to_current_change_percent
previous_to_current_change_percent

trend

event_type
claim_type
speaker/entity

risk_score
severity

confidence

source_document_id
source_document_name
source_document_type

supporting_chunk_ids

page_numbers
row_start
row_end
sheet_name
section_name
location_type
location_value

citation

supporting_excerpt

Whatever fields actually exist in the backend should be preserved.

Do NOT invent fields that do not exist.

============================================================
4. CRITICAL — STOP DUPLICATING EVIDENCE
============================================================

The current Evidence Intelligence screen shows the same evidence/source more
than once.

Example symptom:

fintech.pdf
9. Current Product Assumptions
Page 5

appears multiple times.

This must be fixed at the data/query level.

Do NOT solve this only by hiding duplicates in CSS.

Determine why duplicates are being generated.

Possible causes:

- multiple chunks producing the same evidence
- same evidence persisted multiple times
- API joins multiplying records
- frontend mapping duplicates
- one evidence record per signal instead of one canonical evidence record
- repeated LangGraph writes
- missing unique constraint
- duplicated API requests

Audit all possibilities.

============================================================
5. CANONICAL EVIDENCE IDENTITY
============================================================

The system needs one canonical identity for an evidence item.

Use the existing authoritative evidence/database ID.

Do NOT identify uniqueness using only:

filename
+
page

because multiple real evidence items can exist on the same page.

Preferred conceptual identity:

evidence_id

Then relationships can reference the same evidence:

Signal A
→ evidence_123

Signal B
→ evidence_123

DNA
→ evidence_123

Radar
→ evidence_123

Do NOT create four visually identical evidence items.

============================================================
6. DEDUPLICATION RULE
============================================================

Deduplicate only when the records truly represent the same evidence.

Do NOT blindly use:

new Set(filename)

or:

new Set(statement)

because this can remove legitimate distinct evidence.

Use authoritative evidence IDs wherever available.

If backend data contains multiple rows with identical evidence identity,
fix the persistence/query issue rather than hiding it only in frontend.

============================================================
7. DATABASE AUDIT
============================================================

Inspect evidence persistence.

Look for:

INSERT evidence
INSERT evidence
INSERT evidence

during one analysis.

Check whether the same analysis can create duplicate evidence.

Check:

analysis_id
project_id
source_document_id
evidence_id

and relationships.

If duplicate persistence is occurring:

fix it with:

- idempotency
- upsert
- uniqueness constraints where appropriate
- deterministic evidence IDs
- duplicate detection

Do NOT simply DELETE duplicate rows without understanding why they exist.

============================================================
8. FRONTEND API AUDIT
============================================================

Inspect the API response used by:

Evidence Intelligence.

Print/log one REAL response during development.

Compare:

BACKEND RESPONSE

with:

FRONTEND RECEIVED OBJECT

with:

RENDERED CARD

Find exactly which fields disappear.

Example:

Backend:

{
  statement,
  metric,
  baseline,
  previous,
  current,
  trend,
  confidence,
  source,
  citation
}

Frontend currently:

{
  title,
  source,
  confidence
}

Fix this.

============================================================
9. EVIDENCE LIST UI
============================================================

The Evidence Intelligence page should show concise but meaningful cards.

DO NOT show giant raw chunks.

Each card should contain:

----------------------------------------
EVIDENCE

Core statement

Key metric / key fact

Source:
engineeringmetrics.csv

Location:
Page / Row / Sheet

Confidence:
92%

Category:
TECHNICAL

[View Evidence]
[Open Source]
----------------------------------------

The list is a SUMMARY.

The detail drawer contains the rich information.

============================================================
10. EVIDENCE DETAIL DRAWER
============================================================

CURRENT PROBLEM:

The drawer/modal only shows a tiny statement such as:

"Verified qualitative event/claim backed by source lineage."

This is wasting the detailed information already available from LangGraph.

The drawer must become the primary detailed inspection view.

Use:

EVIDENCE CITATION RECORD

----------------------------------------
CORE EVIDENCE
<real detailed statement>

KEY FACTS
<important extracted facts>

METRIC CONTEXT
<if metric evidence>

BASELINE
value/date

PREVIOUS
value/date

CURRENT
value/date

CHANGE
baseline → current

PERIOD CHANGE
previous → current

TREND
increasing/decreasing/stable
----------------------------------------

SOURCE PROVENANCE

Source:
fintech.pdf

Page:
5

Location:
<actual location>

Confidence:
79%

[Citation]

[Open Source]
----------------------------------------

SUPPORTING EXCERPT

<actual supporting excerpt from the retrieved chunk>
----------------------------------------

TECHNICAL DETAILS
<expandable>
- evidence ID
- analysis ID
- chunk IDs
- retrieval metadata where safe
----------------------------------------

Only render sections that are actually applicable.

============================================================
11. NEVER SHOW GENERIC PLACEHOLDER TEXT
============================================================

Do not show:

"Verified qualitative event/claim backed by source lineage."

when the actual evidence statement is available.

Do not show:

"No engine rationale was returned."

if a real deterministic explanation can be constructed.

Do not show:

"Observed anomaly."

when actual signal/evidence data exists.

Use the real backend content.

============================================================
12. METRIC EVIDENCE
============================================================

For numeric/time-series evidence, prefer structured display.

Example:

API_P95_MS

BASELINE
318 ms
2026-06-01

PREVIOUS
365 ms
2026-08-17

CURRENT
370 ms
2026-08-24

TOTAL CHANGE
+16.35%

PERIOD CHANGE
+1.37%

TREND
INCREASING

RISK
54 / 100
MEDIUM

SOURCE
engineeringmetrics.csv

This is much better than rendering:

"week_start: ... | api_p95_ms: ..."

============================================================
13. QUALITATIVE EVIDENCE
============================================================

For narrative/feedback/claim/event evidence:

show:

TYPE
EVENT / CLAIM

STATEMENT
<real statement>

ENTITY / SPEAKER
<if known>

DATE
<if known>

WHY IMPORTANT
<only if backend provides supported interpretation>

SOURCE
<document>

LOCATION
<page/row/section>

CONFIDENCE
<real value>

SUPPORTING EXCERPT
<real excerpt>

============================================================
14. EVENTS
============================================================

If an evidence item corresponds to an event:

show:

EVENT

Event statement

Event type

Date/time

Entities

Source

Location

Confidence

Citation

Do not treat event as just another generic evidence string.

============================================================
15. CLAIMS
============================================================

For claims:

CLAIM

Statement

Speaker/entity if known

Claim type

Source

Location

Confidence

Evidence excerpt

Do not fabricate speaker/entity.

============================================================
16. SIGNAL → EVIDENCE
============================================================

When evidence is referenced from another screen:

Signal
→ evidence_id
→ Evidence Detail

The detail drawer must show the same complete evidence record.

Do not generate a new summary object.

============================================================
17. FAILURE DNA → EVIDENCE
============================================================

Failure DNA drivers must reference canonical evidence IDs.

Example:

Technical Risk
→ Signal API_P95_MS
→ Evidence evidence_123
→ engineeringmetrics.csv
→ Page/row
→ actual source

============================================================
18. RADAR → EVIDENCE
============================================================

Failure Radar top risks must be able to explain:

WHY?

using actual signals/evidence.

The user should be able to click:

Top Failure Risk
→ supporting signal
→ evidence
→ source

============================================================
19. PREDICTION → EVIDENCE
============================================================

Prediction must expose its supporting evidence.

Prediction:

Release instability

Supporting Signals:

API_P95_MS
Open Bugs
Deployment Failures

Supporting Evidence:

evidence_123
evidence_456

Each must be clickable.

============================================================
20. SOURCE BUTTON
============================================================

"Open Source" must open the actual original source.

Flow:

evidence_id
→ source_document_id
→ authorized document endpoint
→ storage reference
→ RustFS
→ actual file

Do NOT construct a URL from:

filename

Do NOT expose RustFS credentials.

For PDFs, open relevant page when supported.

Example:

fintech.pdf#page=5

============================================================
21. PAGE / ROW / SHEET LOCATION
============================================================

Use source-appropriate locations.

PDF:
Page 5

CSV:
Row/date

XLSX:
Sheet + row/cell

DOCX:
Section/page if available

Markdown/TXT:
Section/line if available

Do NOT label every source:

Page 1

when the backend has a better location.

============================================================
22. IMPORTANT — DO NOT LOSE LANGGRAPH STRUCTURE
============================================================

If LangGraph returns structured output such as:

metrics
events
claims
evidence

preserve those structures.

Do NOT serialize everything into:

statement: string

This is likely one of the reasons the current UI looks sparse.

============================================================
23. CHECK API SERIALIZATION
============================================================

Pydantic/backend serialization may be dropping nested fields.

Audit:

Pydantic response models
FastAPI serializers
ORM serialization
JSON conversion

Make sure nested structures are returned.

Example:

supporting_evidence: [...]

should remain an array.

Do not convert it to:

"ev_001"

unless the UI actually needs a reference.

============================================================
24. CHECK TYPESCRIPT TYPES
============================================================

Frontend TypeScript interfaces must reflect the real backend.

Do not define:

interface Evidence {
  id: string;
  title: string;
  source: string;
}

if backend returns 20 meaningful fields.

Expand the interface accurately.

Avoid:

any

as a shortcut.

============================================================
25. FILTERS
============================================================

Current filters may show:

ALL (10)
METRICS (10)
EVENTS (0)
CLAIMS (0)

even though richer evidence exists.

Audit classification.

Metrics should only contain actual metric evidence.

Events should contain actual events.

Claims should contain actual claims.

Do not classify every evidence item as METRIC.

Do not make EVENTS/CLAIMS disappear because the frontend mapping dropped
their types.

============================================================
26. CATEGORY COUNTS
============================================================

Counts must come from canonical backend evidence records.

Do not count duplicate rendered objects.

If there are:

10 unique evidence records

the UI should not show:

10 metrics

when only 7 are metrics.

============================================================
27. ANALYSIS SCOPING
============================================================

Evidence must belong to the correct:

organization
project
analysis

Do not merge evidence from multiple projects.

When fetching:

GET evidence

apply the proper project/organization authorization.

============================================================
28. QUERYLESS AUTOMATIC ANALYSIS
============================================================

The automatic project analysis already extracts important project information
without requiring a user query.

The Evidence Intelligence screen must therefore display the automatically
extracted result.

Do not force a manual query just to populate this screen.

============================================================
29. QUESTION-ANSWERING IS SEPARATE
============================================================

Evidence Ask can answer a question.

Evidence Intelligence is the persistent analysis result.

Do not make Evidence Intelligence depend on a random previous question.

============================================================
30. NO EXTRA LLM CALL JUST FOR UI
============================================================

Do NOT call another LLM to "make the evidence more detailed."

The detailed information should come from:

existing LangGraph/RAG structured output.

The UI should format it.

Do not increase LLM cost unnecessarily.

============================================================
31. PERFORMANCE
============================================================

Do not send thousands of raw chunks to the frontend.

Backend should return:

- concise evidence summary
- structured fields
- source metadata
- selected supporting excerpt

The full document remains in RustFS.

============================================================
32. DO NOT DISPLAY EVERYTHING AT ONCE
============================================================

The goal is:

DETAILED

but

NOT CLUTTERED.

LIST CARD:

core evidence
+
important fact
+
source
+
confidence

DETAIL DRAWER:

full structured evidence
+
metric context
+
provenance
+
excerpt

TECHNICAL DETAILS:

collapsed

============================================================
33. DEDUPLICATION UX
============================================================

If multiple signals depend on the same evidence:

do not show multiple identical cards.

Show one evidence card.

It may say:

Used by:
3 Signals

or:

Referenced by:
API_P95_MS
Technical Stress
Release Risk

This demonstrates evidence reuse rather than duplication.

============================================================
34. CROSS-SCREEN CONSISTENCY
============================================================

The same evidence must appear consistently in:

Evidence Intelligence
Signal Explorer
Failure DNA
Failure Radar
Prediction
Interventions
Truth Engine

Same evidence_id.

Same source.

Same location.

Same confidence.

Same underlying facts.

============================================================
35. NULL HANDLING
============================================================

Do not display:

null
undefined
N/A

when a richer valid field exists elsewhere in the backend.

But also:

do not invent values to replace null.

Use:

Not available

only when the backend truly has no value.

============================================================
36. CURRENT REFERENCE BEHAVIOR
============================================================

Use the existing working LangGraph/RAG implementation as the reference for
what information is available.

Do NOT simplify the new frontend into a reduced schema.

The rule is:

BACKEND RICH DATA
→ preserve
→ API
→ frontend
→ structured UI

NOT:

BACKEND RICH DATA
→ simplify
→ throw away fields
→ display tiny summary

============================================================
37. LIVE DEBUGGING
============================================================

Use one real analysis.

Inspect:

1. Raw LangGraph response
2. Persisted evidence record
3. Evidence API response
4. Browser Network response
5. Frontend object
6. Rendered card
7. Detail drawer

Capture one example.

For example:

engineeringmetrics.csv

must be traceable:

LangGraph output
→ evidence record
→ API response
→ Evidence card
→ Evidence detail
→ Open Source
→ actual document

============================================================
38. DUPLICATION TEST
============================================================

Run a real analysis with multiple documents.

Check:

- same evidence not repeated
- same source not repeated unnecessarily
- same evidence ID reused
- different real evidence from same document remains separate

Expected:

3 unique evidence items

NOT:

the same evidence rendered 8 times because 8 downstream signals reference it.

============================================================
39. SOURCE TEST
============================================================

Click:

Open Source

Verify:

HTTP 200

and actual file opens.

Then confirm the visible evidence actually exists inside the file.

This is mandatory.

============================================================
40. SECURITY TEST
============================================================

Try accessing:

- another project evidence
- another project's document
- guessed document ID

must return:

401/403/404 according to the existing security model.

Do not weaken authorization while fixing source links.

============================================================
41. TEST EVENTS AND CLAIMS
============================================================

Use a narrative/feedback document.

Verify:

EVENTS count > 0 when genuine events exist.

CLAIMS count > 0 when genuine claims exist.

Each has:

statement
source
location
confidence

If the document genuinely contains none:

0 is correct.

Do not manufacture events or claims.

============================================================
42. TEST TELEMETRY
============================================================

Use a telemetry CSV.

Verify:

METRICS

contain structured:

metric
baseline
previous
current
changes
trend
risk if available
source

Do not turn the entire telemetry table into one giant text blob.

============================================================
43. FRONTEND ERROR STATES
============================================================

If API returns no evidence:

show:

No verified evidence available.

If analysis is running:

show:

Analysis in progress.

If API fails:

show:

Unable to load evidence.

Do not silently substitute mock data.

============================================================
44. REMOVE PRODUCTION MOCK FALLBACKS
============================================================

Search for:

mock evidence
sample evidence
fallback evidence
demo evidence

If API fails, do NOT render fake evidence.

Show an honest error state.

============================================================
45. NO BACKEND DUPLICATION
============================================================

If there is already a canonical Evidence service:

reuse it.

Do not create:

EvidenceServiceV2
EvidenceRepositoryNew
EvidenceAPI2

unless absolutely necessary and justified.

============================================================
46. REQUIRED ARCHITECTURE
============================================================

The final architecture should be:

LANGGRAPH
   ↓
STRUCTURED ANALYSIS
   ↓
PERSISTED EVIDENCE
   ↓
CANONICAL EVIDENCE API
   ↓
FRONTEND

Every downstream screen consumes the canonical evidence.

============================================================
47. FINAL DATA MODEL RELATIONSHIP
============================================================

One canonical evidence:

E123

can support:

Signal S1
Signal S2
DNA D1
Radar R1
Prediction P1
Intervention I1

without creating:

E123-copy1
E123-copy2
E123-copy3

This is important for trust and storage efficiency.

============================================================
48. ACCEPTANCE CRITERIA
============================================================

The fix is complete only when:

A. The frontend receives the full useful LangGraph evidence structure.

B. No meaningful backend evidence fields are silently discarded.

C. Duplicate evidence cards are removed at the correct layer.

D. Unique evidence IDs are preserved.

E. Evidence detail drawer shows substantially richer structured information.

F. Metrics display baseline / previous / current correctly.

G. Events display actual event information.

H. Claims display actual claim information.

I. Source provenance remains attached.

J. Open Source opens the actual file.

K. Signal → Evidence works.

L. Evidence → Source works.

M. DNA → Evidence works.

N. Radar → Evidence works.

O. Prediction → Evidence works.

P. No fake/mock data is used in production.

Q. Private project isolation remains intact.

============================================================
49. REQUIRED SCREEN TARGET
============================================================

Evidence Intelligence LIST:

---------------------------------------------
API_P95_MS

370 ms
+16.35% from baseline
+1.37% vs previous
INCREASING

Risk:
54 / 100
MEDIUM

Source:
engineeringmetrics.csv · 2026-08-24

Confidence:
92%

[View Evidence] [Open Source]
---------------------------------------------

Evidence Detail:

---------------------------------------------
API_P95_MS
Technical Metric

CORE FINDING
P95 API latency increased to 370 ms.

TIME SERIES
Baseline: 318 ms
Previous: 365 ms
Current: 370 ms

CHANGE
Total: +16.35%
Period: +1.37%

TREND
Increasing

RISK
54 / 100 — MEDIUM

KEY EVIDENCE
<real extracted evidence>

SOURCE
engineeringmetrics.csv

LOCATION
<real row/date/page>

CONFIDENCE
92%

SUPPORTING EXCERPT
<real excerpt>

[OPEN SOURCE]

TECHNICAL DETAILS ▼
---------------------------------------------

This is an example of presentation structure only.
Use the ACTUAL backend values.

============================================================
50. IMPORTANT — DO NOT COPY THE EXAMPLE VALUES
============================================================

The values above are illustrative.

The implementation must render actual current backend data.

Do NOT hardcode:

API_P95_MS
370
54
92%

or any other values.

============================================================
51. REGRESSION TESTS
============================================================

Add tests for:

- rich evidence field preservation
- duplicate evidence prevention
- canonical evidence IDs
- evidence API serialization
- metrics
- events
- claims
- source provenance
- project isolation
- source URL generation
- source download/open
- frontend mapping
- evidence detail rendering

============================================================
52. FINAL LIVE TEST
============================================================

Run one real project analysis with:

- telemetry document
- narrative document
- feedback document

Then verify:

1. LangGraph extracts evidence.
2. Evidence is persisted once.
3. Evidence API returns rich structure.
4. Evidence Intelligence shows unique cards.
5. Metric card shows detailed metric context.
6. Event card shows actual event.
7. Claim card shows actual claim.
8. Detail drawer shows rich structured information.
9. Evidence IDs are clickable.
10. Source is clickable.
11. Actual source file opens.
12. Signal references the same evidence.
13. Failure DNA references the same evidence.
14. Radar references the same evidence.
15. Prediction references the same evidence where applicable.

============================================================
53. FINAL REPORT
============================================================

Return:

1. ROOT CAUSE OF DATA LOSS
2. ROOT CAUSE OF DUPLICATION
3. LANGGRAPH FIELDS AVAILABLE
4. LANGGRAPH FIELDS PREVIOUSLY LOST
5. BACKEND CHANGES
6. DATABASE CHANGES
7. API CHANGES
8. FRONTEND TYPE CHANGES
9. FRONTEND COMPONENT CHANGES
10. DEDUPLICATION STRATEGY
11. PROVENANCE STRATEGY
12. SOURCE OPENING FIX
13. EVENTS/CLAIMS FIX
14. METRIC DISPLAY FIX
15. TESTS ADDED
16. TEST RESULTS
17. FRONTEND BUILD RESULT
18. LIVE END-TO-END RESULT

Also provide:

BEFORE:
<what the frontend was receiving/displaying>

AFTER:
<what the frontend receives/displays>

============================================================
FINAL PRINCIPLE
============================================================

The LangGraph/RAG backend already does the hard work.

Do not throw away that intelligence.

The correct architecture is:

LANGGRAPH
→ rich structured evidence
→ persist
→ canonical API
→ preserve all useful fields
→ deduplicate by authoritative identity
→ render concise summary
→ open rich detail
→ trace to actual source

The user must be able to go:

EVIDENCE
↓
DETAIL
↓
SOURCE
↓
ACTUAL DOCUMENT

and understand:

WHAT WAS FOUND?
WHY DOES IT MATTER?
WHAT DATA SUPPORTS IT?
WHERE DID IT COME FROM?

NO MOCK DATA.
NO DUPLICATES.
NO LOST FIELDS.
NO FAKE SOURCES.
NO RAW-DUMP UI.
NO UNSUPPORTED CLAIMS.

FIX THE DATA PIPELINE FIRST, THEN THE UI.

============================================================
START WITH AUDIT — DO NOT MODIFY CODE UNTIL YOU IDENTIFY
THE EXACT DATA-LOSS AND DUPLICATION POINTS.
============================================================