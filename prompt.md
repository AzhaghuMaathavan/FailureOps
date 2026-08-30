MASTER PROMPT — FIX LANGGRAPH SIGNAL VALUES SHOWING N/A IN SIGNAL EXPLORER

PROJECT:
FAILUREOPS X — Project Failure Intelligence

CURRENT BUG
===========

In the FailureOps frontend:

/projects/{projectId}/signals

the Signal Explorer cards show real-looking signal names, risk badges,
confidence, and evidence counts, BUT the telemetry section shows:

Baseline: N/A
Previous: N/A
Current: N/A

Total Change (Baseline): N/A
Period Change (Previous): N/A

Risk Score Movement:
Previous Risk: N/A
Current Risk: N/A
Risk Change: 0%

This indicates that the frontend is receiving signal objects, but the
structured metric/time-series fields are either:

1. not being produced by LangGraph,
2. being dropped during persistence,
3. being dropped by the API,
4. being renamed/mapped incorrectly,
5. or the frontend is reading the wrong fields.

DO NOT hardcode values.

DO NOT fill N/A with guessed values.

DO NOT create fake telemetry.

DO NOT redesign the Signal Explorer first.

FIX THE REAL DATA CONTRACT:

DOCUMENT
→ RAG
→ LANGGRAPH
→ SIGNAL AGENT
→ SIGNAL SCHEMA
→ DATABASE
→ API
→ FRONTEND

============================================================
1. FIRST — FORENSIC AUDIT
============================================================

Do not immediately modify the UI.

Trace one REAL signal from its origin to the browser.

Choose an actual metric signal from a real uploaded document.

Example:

API_P95_MS

or whatever real metric currently exists in the project.

Trace:

Source document
→ parsed metric
→ chunk
→ retrieval
→ LangGraph state
→ Evidence Agent
→ Signal Agent
→ signal schema
→ persistence
→ GET /api/signals
→ frontend API client
→ SignalCard

For each stage write:

PASS / FAIL

Also identify exactly where the following fields disappear:

baseline
previous
current
baseline_date
previous_date
current_date
baseline_change
period_change
previous_risk
current_risk
risk_change
trend

============================================================
2. INSPECT THE REAL LANGGRAPH OUTPUT
============================================================

Inspect the actual output of the current LangGraph graph.

Do not infer it from the frontend.

Inspect:

FailureOpsGraphState

EvidenceAgent output

SignalAgent output

SignalPacket

Signal item schema

ProjectAnalysis.signal_packet

For one real metric signal, print/log a SAFE STRUCTURED OBJECT
(without secrets).

Example shape:

{
  "canonical_name": "...",
  "current_value": ...,
  "previous_value": ...,
  "baseline_value": ...,
  "current_date": "...",
  "previous_date": "...",
  "baseline_date": "...",
  "period_change_pct": ...,
  "baseline_change_pct": ...,
  "risk_score": ...,
  "previous_risk_score": ...,
  "risk_change_pct": ...,
  "trend": "..."
}

The real field names may differ.

DO NOT invent this schema.

Use the actual schema.

============================================================
3. IDENTIFY THE TRUE SOURCE OF METRIC VALUES
============================================================

For metric signals, values should originate from the real extracted telemetry.

Trace:

document
→ Evidence Agent metric
→ normalized time-series representation
→ Signal Agent
→ risk calculation

Make sure the Signal Agent has access to:

current value
previous value
baseline value
dates
metric name
unit
trend

If these values exist in evidence but not in the signal:
THE SIGNAL AGENT MAPPING IS BROKEN.

If they do not exist in evidence:
THE EVIDENCE EXTRACTION / TIME-SERIES STAGE IS BROKEN.

If they exist in signal but disappear after persistence:
THE PERSISTENCE SERIALIZATION IS BROKEN.

If they exist in API but display N/A:
THE FRONTEND MAPPING IS BROKEN.

============================================================
4. IMPORTANT — USE EXISTING TIME-SERIES ENGINE
============================================================

The project already has a deterministic time-series engine.

DO NOT recreate it.

Reuse the existing canonical implementation for:

baseline
previous
current
baseline change
period change
trend

The Signal Agent must consume the canonical normalized time-series data.

Do NOT recalculate these values differently in the frontend.

============================================================
5. METRIC SIGNAL CONTRACT
============================================================

A metric signal returned by the backend should expose enough structured
information for the UI to display:

METRIC

canonical metric name

current value

previous value

baseline value

unit

current date

previous date

baseline date

trend

baseline change %

period change %

current risk

previous risk

risk change %

severity

confidence

supporting evidence IDs

source document references

Use the actual existing project naming conventions.

Do not introduce duplicate names like:

current_value
currentValue
currentMetricValue

Choose one canonical backend contract and map it once.

============================================================
6. FIX LANGGRAPH → SIGNAL CONTRACT
============================================================

Inspect the Evidence Agent result.

Example conceptual structure:

{
  "metric": {
    "canonical_name": "API_P95_MS",
    "baseline_value": 318,
    "previous_value": 365,
    "current_value": 370,
    "baseline_date": "2026-06-01",
    "previous_date": "2026-08-17",
    "current_date": "2026-08-24"
  }
}

Then the Signal Agent should preserve the structured metric.

Do NOT convert the metric into only:

"Observed technical observations..."

and lose the numerical fields.

============================================================
7. FIX SIGNAL SCHEMA
============================================================

Inspect:

rag/app/schemas/signal_packet.py

and related Signal schemas.

Make sure metric information is represented structurally.

Do NOT use a giant string for numerical information.

BAD:

{
  "statement":
  "baseline 318 previous 365 current 370 ..."
}

GOOD:

{
  "metric_name": "...",
  "baseline_value": 318,
  "previous_value": 365,
  "current_value": 370,
  ...
}

Use the actual existing architecture.

============================================================
8. FIX SIGNAL AGENT
============================================================

Inspect:

signal_agent.py

and every function that builds a signal.

The Signal Agent must preserve:

- metric identity
- values
- dates
- changes
- trend
- risk
- evidence links

Do not replace missing fields with:

None

unless the source genuinely has no value.

============================================================
9. NULL VS NOT-APPLICABLE
============================================================

This distinction is IMPORTANT.

For a qualitative signal:

Baseline:
N/A

may be correct.

For a metric signal:

API_P95_MS

if the backend has real:

318
365
370

then returning:

N/A

is WRONG.

The frontend should only show N/A when the metric truly has no corresponding
value.

============================================================
10. FIX DATABASE PERSISTENCE
============================================================

Inspect how signals are persisted.

Check:

signal_items

ProjectAnalysis.signal_packet

any JSON/JSONB fields

ORM/Pydantic serialization

Confirm the following survive persistence:

baseline_value
previous_value
current_value

baseline_date
previous_date
current_date

baseline_change
period_change

trend

risk score fields

If the database currently stores only:

title
statement
risk

then preserve the complete structured signal packet.

Do not store critical metric information only in frontend state.

============================================================
11. FIX API SERIALIZATION
============================================================

Inspect:

GET /api/signals

including:

FastAPI route
response model
Next.js BFF
TypeScript client

Verify the API JSON actually contains the metric values.

For one real signal, the response should contain the real values.

Example only:

{
  "canonical_name": "API_P95_MS",
  "baseline_value": 318,
  "previous_value": 365,
  "current_value": 370,
  ...
}

Do not copy these example values into code.

Use actual database values.

============================================================
12. CHECK Pydantic SERIALIZATION
============================================================

A common failure is:

backend object contains fields

BUT

response model excludes them.

Inspect all response models.

Make sure fields are not silently removed by:

response_model

model_dump()

dict conversion

custom serializer

JSON transformation

Next.js BFF mapping

============================================================
13. FIX NEXT.JS BFF MAPPING
============================================================

Inspect:

frontend/app/api/signals/route.ts

and:

frontend/lib/api/client.ts

Check whether the backend returns:

snake_case

while frontend expects:

camelCase

Example:

Backend:

baseline_value

Frontend:

baselineValue

If required, create ONE explicit mapping.

Do NOT support random combinations everywhere.

Canonical flow:

Backend schema
→ BFF mapping
→ frontend TypeScript type

============================================================
14. FIX TYPESCRIPT SIGNAL TYPE
============================================================

Inspect the existing:

Signal
SignalItem
SignalPacket
Metric
Risk

interfaces/types.

Make the types accurately match the backend.

Do not use:

any

to hide the mismatch.

Do not do:

signal.currentValue || "N/A"

until you know the correct source field.

============================================================
15. FIX SIGNAL CARD MAPPING
============================================================

Inspect:

frontend/components/signals/SignalCard.tsx

and the Signal Explorer page.

Find where these are currently rendered:

Baseline
Previous
Current
Total Change
Period Change
Previous Risk
Current Risk
Risk Change

Determine exactly which fields are read.

Example BAD:

signal.rawTelemetry?.baseline

when backend actually returns:

signal.baseline_value

Fix the mapping.

DO NOT put calculations in the card if the backend already calculates them.

============================================================
16. RISK MOVEMENT
============================================================

The card currently shows:

Previous Risk: N/A
Current Risk: N/A
Risk Change: 0%

The backend must expose:

previous risk score

current risk score

risk change

for metric signals where those values are available.

Use the canonical deterministic risk calculation.

Do not derive a fake risk movement from the UI.

============================================================
17. TREND
============================================================

If the backend identifies:

INCREASING

the card should show:

INCREASING

If:

DECREASING

show:

DECREASING

If:

STABLE

show:

STABLE

Do not infer trend independently in React.

Use the canonical backend signal.

============================================================
18. EVIDENCE LINKS
============================================================

Every metric signal must retain:

supporting evidence IDs

source document IDs

source names

location metadata

The UI should allow:

Signal
→ Supporting Evidence
→ Evidence Detail
→ Original Source

Do not lose provenance while fixing metric fields.

============================================================
19. REAL EXAMPLE TRACE
============================================================

Choose one REAL metric signal.

For example:

API_P95_MS

Trace exactly:

Source:
engineeringmetrics.csv

↓

Extracted metric:
baseline = real value
previous = real value
current = real value

↓

LangGraph Evidence Agent

↓

Signal Agent

↓

SignalPacket

↓

PostgreSQL

↓

GET /api/signals

↓

frontend

↓

SignalCard

Return a before/after field table:

| Field | LangGraph | DB | API | Frontend |
|---|---|---|---|---|
| metric name | | | | |
| baseline | | | | |
| previous | | | | |
| current | | | | |
| dates | | | | |
| baseline change | | | | |
| period change | | | | |
| trend | | | | |
| previous risk | | | | |
| current risk | | | | |
| risk change | | | | |

Every important field must survive.

============================================================
20. QUALITATIVE SIGNALS
============================================================

Do NOT force metric fields onto qualitative signals.

For a qualitative signal:

show the meaningful qualitative statement.

For a metric signal:

show the numeric time-series panel.

The UI should choose the appropriate rendering based on actual signal type.

============================================================
21. NO HARDCODED DEMO VALUES
============================================================

Absolutely forbidden:

if metric == "API_P95_MS":
    baseline = 318
    current = 370

or:

const demoSignal = ...

or:

if (!value) value = 365

Use actual backend data.

============================================================
22. NO FAKE FALLBACKS
============================================================

Do NOT do:

signal.current_value ?? 0

signal.current_value ?? 100

signal.current_value ?? mockValue

Do NOT convert missing data into fake numerical values.

Correct:

if data exists:
    display data

if data genuinely does not exist:
    display "N/A"

============================================================
23. VERIFY REAL DATABASE DATA
============================================================

After analysis, query the DB through the application's normal data layer.

Find one metric signal.

Confirm actual values exist.

If they do not:

trace backward.

Do not fix UI before fixing persistence.

============================================================
24. VERIFY PGVECTOR RELATIONSHIP
============================================================

Confirm the signal ultimately originated from a document that was:

parsed
→ chunked
→ embedded
→ stored in pgvector
→ retrieved

The signal must not originate from static seeded data.

============================================================
25. VERIFY REAL DOCUMENT PROVENANCE
============================================================

For the chosen metric:

show:

document_id
chunk_id
source document
source location
metric value

The Signal Explorer should be connected to real evidence.

============================================================
26. REMOVE DUPLICATE TRANSFORMATION LOGIC
============================================================

Search for multiple places calculating:

baseline
previous
current
risk change
trend

There should be one canonical backend calculation.

Frontend should display.

Do not have:

LangGraph calculation
+
API calculation
+
React calculation

for the same metric.

============================================================
27. PRESERVE EXISTING RISK ENGINE
============================================================

Do NOT replace the current metric-aware risk engine.

The risk score must come from the existing canonical risk calculation.

Signal Explorer should display the resulting values.

============================================================
28. PERFORMANCE
============================================================

Do NOT call LangGraph or the LLM every time Signal Explorer renders.

Correct flow:

Analysis
→ LangGraph runs once
→ signals persisted
→ Signal Explorer reads persisted signals

No repeated LLM calls from React.

============================================================
29. CACHE / STALE DATA
============================================================

Verify that Signal Explorer is loading the latest completed analysis.

Avoid showing an old signal packet after a new analysis.

Ensure cache invalidation/revalidation is correct after analysis completion.

============================================================
30. TEST WITH A REAL UPLOADED DOCUMENT
============================================================

Use a fresh telemetry document.

Example content:

metric_name: API_P95_MS
baseline: 100
previous: 130
current: 160

Also include dates.

Upload through the real frontend.

Run analysis.

Expected Signal Explorer:

BASELINE
100

PREVIOUS
130

CURRENT
160

TOTAL CHANGE
+60%

PERIOD CHANGE
+23.08%

These numbers are TEST DATA ONLY.

Do not hardcode them.

The real values shown by the UI must come from the uploaded document.

============================================================
31. NEGATIVE TEST
============================================================

Create a qualitative signal with no numeric time-series data.

Verify it does NOT display fake metric values.

Example:

Baseline:
N/A

only because the source genuinely has no metric.

============================================================
32. API CONTRACT TEST
============================================================

Add a backend integration test that asserts:

a real metric signal includes:

baseline
previous
current
dates
trend
risk information

when those values exist.

============================================================
33. FRONTEND CONTRACT TEST
============================================================

Add a frontend test that feeds a real API-shaped signal object into SignalCard
and verifies:

baseline appears

previous appears

current appears

changes appear

risk movement appears

trend appears

No "N/A" is rendered for fields supplied by the API.

============================================================
34. END-TO-END TEST
============================================================

Create/update the golden test:

UPLOAD
→ PARSE
→ CHUNK
→ EMBED
→ PGVECTOR
→ RETRIEVE
→ LANGGRAPH
→ EVIDENCE
→ SIGNAL
→ DB
→ API
→ SIGNAL EXPLORER

Assert:

real metric value reaches the final rendered signal.

============================================================
35. BROWSER DEVTOOLS PROOF
============================================================

After fixing:

Open Signal Explorer.

Open DevTools → Network.

Inspect:

GET /api/signals?projectId=...

Verify the JSON contains real:

baseline
previous
current
risk
trend

Then compare the browser display.

The UI must exactly correspond to the API.

============================================================
36. IMPORTANT — CHECK ALL SIGNAL TYPES
============================================================

Do not fix only API_P95_MS.

Test:

- technical metric
- operational metric
- adoption metric
- qualitative customer signal
- other supported signal types

Each should render correctly according to its actual data type.

============================================================
37. DO NOT BREAK EVIDENCE INTELLIGENCE
============================================================

Signal Explorer and Evidence Intelligence should share canonical evidence.

Fixing Signal Explorer must not break:

Evidence Intelligence
Evidence Detail
Open Source
provenance
document links

============================================================
38. DO NOT DUPLICATE BACKEND LOGIC
============================================================

Reuse the existing:

Evidence Agent
Signal Agent
TimeSeriesEngine
Risk Engine
SignalPacket
Evidence models

Do NOT create:

SignalServiceV2
MetricEngineV2
RiskEngineV2

unless the audit proves the existing implementation is unusable.

============================================================
39. FINAL ACCEPTANCE CRITERIA
============================================================

The fix is complete only when:

✓ Real uploaded telemetry reaches LangGraph.

✓ Evidence Agent extracts the metric.

✓ Time-Series Engine creates baseline/previous/current.

✓ Signal Agent receives those values.

✓ Signal schema preserves those values.

✓ PostgreSQL persists those values.

✓ API returns those values.

✓ BFF preserves those values.

✓ TypeScript types represent those values.

✓ SignalCard reads the correct fields.

✓ Baseline displays correctly.

✓ Previous displays correctly.

✓ Current displays correctly.

✓ Total Change displays correctly.

✓ Period Change displays correctly.

✓ Previous Risk displays correctly when available.

✓ Current Risk displays correctly when available.

✓ Risk Change displays correctly when available.

✓ Trend displays correctly.

✓ Qualitative signals do not receive fake metrics.

✓ No hardcoded numbers.

✓ No mock fallback.

✓ No unnecessary LLM calls.

✓ Evidence links still work.

✓ Source provenance remains intact.

============================================================
40. FINAL REPORT
============================================================

Return:

1. EXACT ROOT CAUSE

Was the issue in:

LangGraph?
Evidence Agent?
Signal Agent?
Schema?
Persistence?
API?
BFF?
TypeScript?
SignalCard?

2. DATA PATH BEFORE

<where values disappeared>

3. DATA PATH AFTER

<how values now travel>

4. REAL EXAMPLE

Document:
...

Metric:
...

Baseline:
...

Previous:
...

Current:
...

Total Change:
...

Period Change:
...

Trend:
...

Previous Risk:
...

Current Risk:
...

Risk Change:
...

5. FILES CHANGED

...

6. DATABASE CHANGES

...

7. API CHANGES

...

8. LANGGRAPH CHANGES

...

9. FRONTEND CHANGES

...

10. TESTS

...

11. TEST RESULTS

...

12. BROWSER NETWORK VERIFICATION

GET /api/signals:
PASS/FAIL

13. FINAL VERDICT

Signal Explorer:
REAL DATA / PARTIAL / FAIL

============================================================
MOST IMPORTANT RULE
============================================================

DO NOT FIX THE N/A DISPLAY BY PUTTING VALUES INTO REACT.

The correct chain is:

REAL DOCUMENT
→ REAL PARSED METRIC
→ REAL CHUNK
→ REAL EMBEDDING
→ REAL PGVECTOR RETRIEVAL
→ REAL LANGGRAPH STATE
→ REAL EVIDENCE
→ REAL TIME SERIES
→ REAL SIGNAL
→ REAL DATABASE
→ REAL API
→ REAL FRONTEND

Every value shown in Signal Explorer must originate from that chain.

START WITH FORENSIC AUDIT.
IDENTIFY THE FIRST POINT WHERE THE REAL VALUES DISAPPEAR.
THEN FIX THAT POINT AND PROPAGATE THE CANONICAL DATA CONTRACT.