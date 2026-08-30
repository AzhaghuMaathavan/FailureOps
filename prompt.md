MASTER FORENSIC FIX
FAILUREOPS — END-TO-END EVIDENCE PROVENANCE, EXPLANATIONS, CLICKABLE SOURCES,
FAILURE DNA, RADAR AND PREDICTION

============================================================
PRIMARY OBJECTIVE
============================================================

The application already uses RAG + LangGraph and is producing:

- Evidence
- Signals
- Events
- Claims
- Risk scores
- Failure DNA
- Failure Radar
- Predictions
- Interventions

BUT the current UI has a major TRUST / TRACEABILITY problem.

The system must be able to prove:

WHAT DID THE SYSTEM SAY?
        ↓
WHAT EVIDENCE CAUSED IT?
        ↓
WHICH DOCUMENT CONTAINS THAT EVIDENCE?
        ↓
WHERE IN THE DOCUMENT?
        ↓
CAN THE USER OPEN THE ACTUAL SOURCE?

Every major intelligence output must be traceable back to real retrieved
evidence.

NO MOCK DATA.
NO DISPLAY-ONLY EVIDENCE IDs.
NO BROKEN #ev_001 links.
NO UNCLICKABLE SOURCE REFERENCES.
NO UNSUPPORTED RISK EXPLANATIONS.
NO "AI SAID THIS" WITHOUT PROOF.

============================================================
0. DO NOT MODIFY THE SYSTEM BLINDLY
============================================================

Before editing anything:

AUDIT THE CURRENT IMPLEMENTATION.

Trace one complete real example:

Document
→ RAG retrieval
→ LangGraph
→ Evidence
→ Signal
→ Failure DNA
→ Radar
→ Prediction
→ Intervention
→ UI

Identify where provenance is lost.

Also inspect:

- DB models
- Pydantic schemas
- API response models
- frontend TypeScript types
- frontend components
- API client functions
- source/download endpoint
- RustFS object references
- evidence IDs
- document IDs
- chunk IDs
- page numbers
- row/sheet location
- analysis IDs
- signal IDs
- prediction IDs

DO NOT GUESS.

At the start of the final report state:

PROVENANCE BREAKPOINT:
<exact place where linkage was being lost>

============================================================
1. ONE AUTHORITATIVE PROVENANCE MODEL
============================================================

Create/standardize ONE provenance contract used everywhere.

Every grounded intelligence item must be able to reference:

{
  "evidence_id": "...",
  "source_document_id": "...",
  "source_document_name": "...",
  "source_document_type": "...",
  "supporting_chunk_ids": [...],
  "location_type": "PAGE | ROW | SHEET | SECTION | OFFSET",
  "location_value": "...",
  "page_numbers": [...],
  "row_start": ...,
  "row_end": ...,
  "sheet_name": "...",
  "citation": "...",
  "confidence": ...
}

Only fields applicable to the source need to be populated.

DO NOT create fake values.

============================================================
2. CRITICAL — #EV_001 PROBLEM
============================================================

The UI currently displays values such as:

#ev_001
#ev_002
#ev_003

in many places.

Some are not clickable.

This must be fixed.

There is a difference between:

DISPLAY ID

and

REAL DATABASE EVIDENCE ID.

A display identifier such as:

ev_001

must NOT be the only thing used to open evidence.

Every evidence reference must resolve through the actual persisted evidence
record / database ID or a stable backend evidence identifier.

Example:

signal
→ evidence_id = "a6f..."
→ GET evidence/a6f...
→ source_document_id = "doc_123"
→ GET document/doc_123/download
→ fintech.pdf

============================================================
3. EVIDENCE REFERENCES MUST BE CLICKABLE EVERYWHERE
============================================================

Search the entire frontend for:

#ev_
ev_001
ev_002
Evidence ID
supporting evidence
source evidence
evidence references

Replace display-only references with actual clickable navigation.

Wherever the UI displays:

#ev_001

make it a real link/button.

Clicking it must open:

Evidence detail

or

Evidence Citation Record

with:

- core evidence
- source
- location
- confidence
- supporting excerpt
- Open Source

Do NOT navigate to a nonexistent route.

============================================================
4. SOURCE OPENING MUST USE DOCUMENT ID
============================================================

NEVER construct a source URL from:

filename

Example BAD:

/documents/fintech.pdf

Example GOOD:

/documents/{document_id}/download

The chain must be:

Evidence
→ evidence_id
→ source_document_id
→ authorized document endpoint
→ storage reference
→ RustFS
→ actual file

Preserve project and organization authorization.

============================================================
5. FIX "OPEN SOURCE"
============================================================

Every:

Open Source

button must actually open the source file.

Verify using browser Network tools.

Expected:

GET <document-download-endpoint>
→ HTTP 200
→ actual file

For PDF:

Content-Type = application/pdf

and browser should open the real document.

For CSV/XLSX/DOCX/etc. use correct MIME behavior.

If the evidence points to page 5:

optionally open:

document.pdf#page=5

ONLY if the source is a PDF and the architecture supports it.

============================================================
6. EVIDENCE INTELLIGENCE SCREEN
============================================================

The Evidence Intelligence page must show useful evidence, not raw chunk
dumps.

DEFAULT VIEW:

CORE EVIDENCE
<important statement>

SOURCE
engineeringmetrics.csv

LOCATION
Page 1 / Row X / Sheet Y

CONFIDENCE
92%

[Open Evidence]
[Open Source]

Optional expanded:

Supporting excerpt
Chunk ID
Technical details

Do NOT show huge raw table text by default.

============================================================
7. EVERY SIGNAL NEEDS SUPPORTING EVIDENCE
============================================================

For every signal:

Signal
↓
Supporting Evidence
↓
Source

Example:

API_P95_MS
Risk: 54/100
Severity: MEDIUM
Trend: INCREASING

Supporting evidence:
API P95 increased from 365 ms → 370 ms.

Source:
engineeringmetrics.csv

Location:
2026-08-24 row

Confidence:
92%

[View Evidence]
[Open Source]

A signal must NEVER appear without a traceable evidence reference unless
explicitly marked:

INSUFFICIENT_EVIDENCE

============================================================
8. SIGNAL EXPLORER MUST NOT SHOW GENERIC PLACEHOLDERS
============================================================

CURRENT PROBLEM:

Examples such as:

"Adoption Observations — Observed anomaly"

"Technical Observations — Observed anomaly"

are too generic.

The signal should describe the actual detected change.

BAD:

Technical Observations
Observed anomaly

GOOD:

API_P95_MS
365 ms → 370 ms
+1.37%
INCREASING
Risk: 54/100

Supporting Evidence: 1

[View Evidence]

The signal title should come from the actual canonical metric / signal name.

Do NOT hardcode metric names.

============================================================
9. SIGNAL EXPLANATION
============================================================

When a user clicks a signal, show:

WHAT CHANGED?
WHY DOES IT MATTER?
WHAT IS THE RISK SCORE?
WHAT EVIDENCE SUPPORTS IT?
WHERE DID THE EVIDENCE COME FROM?

Example:

API_P95_MS increased from 365 ms to 370 ms.

Risk:
54 / 100 — MEDIUM

Why:
Current latency is above the configured target threshold.

Evidence:
engineeringmetrics.csv
2026-08-24

[View Evidence]
[Open Source]

============================================================
10. FAILURE DNA
============================================================

CURRENT ISSUE:

Failure DNA currently shows:

Customer Risk Decomposition
Score: 30/100
Historical Correlation Verified

but may then say:

"No engine rationale was returned."

This is not acceptable.

Failure DNA must have a deterministic explanation.

For each dimension:

Adoption
Technical
Operational
Execution
Customer
Financial
Security
Quality

show:

SCORE
SEVERITY
EVIDENCE DRIVERS
WHY THE SCORE EXISTS
SUPPORTING SIGNALS
SUPPORTING EVIDENCE
HISTORICAL STATUS

============================================================
11. FAILURE DNA EXPLANATION CONTRACT
============================================================

Example:

CUSTOMER RISK
Score: 30/100
Severity: LOW

WHY THIS SCORE EXISTS

Customer-related evidence shows <actual supported observation>.

DRIVERS

• Customer feedback signal A
• Signal B

SUPPORTING EVIDENCE

• customerfeedback.csv
• feedback row/date

[View Evidence]

If there is no explanation available:

do NOT write generic:

"No engine rationale was returned."

Instead say:

"Insufficient evidence to explain this dimension."

and show the evidence that does exist.

============================================================
12. DO NOT CLAIM HISTORICAL CORRELATION WITHOUT HISTORY
============================================================

This is critical.

If there is no historical memory match:

DO NOT display:

Historical Correlation Verified

instead display:

No historical correlation available

or:

Novel pattern — no historical memory match

Historical information must come from actual stored historical memory.

Never fabricate it.

============================================================
13. FAILURE DNA SCORE MUST BE TRACEABLE
============================================================

For each dimension:

dimension score
        ↓
contributing signals
        ↓
evidence items
        ↓
source documents

Example:

CUSTOMER = 30

Drivers:
Customer Observations

Evidence:
ev_xxx

Source:
customerfeedback.csv

The user must be able to click through this entire chain.

============================================================
14. FAILURE RADAR
============================================================

CURRENT ISSUE:

Top Failure Risks show:

1. Adoption Stress
2. Technical Stress
3. Operational Stress

but there is little/no detailed explanation.

FIX THIS.

Every top failure risk must have:

Risk name
Dimension
Risk score
Severity
Why it is ranked here
Main contributing signals
Evidence
Sources
Trend
Confidence

Example:

1. Technical Stress
Risk: 54/100
Severity: MEDIUM

WHY:
API latency is increasing and currently exceeds target threshold.

SIGNALS:
API_P95_MS

EVIDENCE:
engineeringmetrics.csv

[View Evidence]

============================================================
15. TOP FAILURE RISKS MUST BE SORTABLE BY REAL DATA
============================================================

Do NOT create a static list.

Ranking should derive from actual:

risk score
severity
signal strength
confidence
trend
corroboration

Use the existing FailureOps ranking logic.

Show the actual reason for the ranking.

============================================================
16. FAILURE RADAR — DETAILED RISK CARD
============================================================

Clicking a top failure risk should open:

RISK

<risk name>

SCORE
54/100

SEVERITY
MEDIUM

WHY
<actual deterministic explanation>

CONTRIBUTING SIGNALS
<signals>

EVIDENCE
<evidence items>

SOURCES
<document names + locations>

CONFIDENCE
92%

[View Evidence]
[Open Source]

============================================================
17. PREDICTED NEXT FAILURE
============================================================

CURRENT ISSUE:

Prediction page says:

"No Major Failure Predicted"

but also displays:

Why this path
If ignored
92% probability
6+ months

This can become misleading if no actual failure prediction exists.

If there is no predicted failure:

show:

NO MAJOR FAILURE PREDICTED

Then explain only what the evidence supports.

Do NOT attach a fabricated failure narrative.

If prediction exists:

show:

PREDICTED FAILURE
PROBABILITY
TIME WINDOW
CONFIDENCE

WHY THIS PREDICTION EXISTS

<actual signals + evidence>

IF IGNORED

<evidence-supported consequence>

SUPPORTING EVIDENCE

<clickable evidence IDs>

============================================================
18. PREDICTION MUST BE EVIDENCE-LINKED
============================================================

Prediction:

"Release instability may increase"

must reference:

Signal A
Signal B
Evidence A
Evidence B

Each clickable.

Source documents visible.

============================================================
19. NO UNSUPPORTED PROBABILITIES
============================================================

Do NOT show:

92%
89%
76%

unless the current backend actually calculates/returns these values.

Every probability must have a documented calculation/model source.

If probability is unavailable:

show:

Not enough evidence to estimate probability.

============================================================
20. INTERVENTIONS
============================================================

Every intervention must be tied to:

identified problem
supporting signal
evidence
expected outcome

Example:

Problem:
Onboarding friction

Evidence:
customer_feedback.csv

Signal:
Adoption stress

Recommendation:
Streamline onboarding

Do NOT show recommendations as disconnected AI advice.

============================================================
21. INTERVENTION → EVIDENCE
============================================================

Each intervention should expose:

WHY THIS ACTION?

Supporting signals

Supporting evidence

Expected effect

Confidence

[View Evidence]

============================================================
22. EXPERIMENTS
============================================================

The experiment hypothesis must come from a real intervention.

Example:

Hypothesis:
"Streamlining onboarding will improve adoption."

Show:

Evidence driver
→ Intervention
→ Hypothesis
→ Control
→ Treatment
→ Metric
→ Outcome

If there is no actual experiment running:

show:

PLANNED

Do not show fake progress or fake lift.

============================================================
23. OUTCOME VERIFICATION
============================================================

If no real experiment outcome exists:

show:

No verified outcome recorded yet.

Do not create synthetic success.

Once outcome exists:

show:

Baseline
Treatment
Observed difference
Confidence
Statistical result
Evidence
Source

============================================================
24. CROSS-SCREEN EVIDENCE CONSISTENCY
============================================================

CRITICAL:

The SAME evidence record must remain the SAME evidence record across:

Evidence Intelligence
Signals
Failure DNA
Failure Radar
Prediction
Interventions
Experiments
Truth Engine

Do not create:

Evidence #1 in one screen
and
another duplicate evidence #1 in another screen.

Use the same authoritative IDs.

============================================================
25. ANALYSIS PACKET
============================================================

When LangGraph finishes, persist one structured analysis packet:

analysis_id
project_id
documents
evidence
events
claims
metrics
signals
risk_dimensions
predictions
interventions
provenance
confidence
status

All downstream screens should read from this structured packet.

Do NOT rerun the LLM whenever the user opens a tab.

============================================================
26. LANGGRAPH OUTPUT
============================================================

LangGraph should produce structured data rather than only prose.

Expected conceptual result:

{
  "analysis_id": "...",

  "evidence": [...],

  "events": [...],

  "claims": [...],

  "metrics": [...],

  "signals": [...],

  "risk_dimensions": [...],

  "predictions": [...],

  "interventions": [...],

  "sources": [...]
}

Use the existing actual schemas where available.

============================================================
27. PROVENANCE MUST SURVIVE EVERY LANGGRAPH NODE
============================================================

Audit every node.

validate_request
retrieve_evidence
evidence_agent
validate_evidence
signal_agent
validate_signals
finalize_output

No node may accidentally discard:

evidence_id
document_id
chunk_id
page
location
citation
confidence

Example:

retrieve_evidence
→ chunk

evidence_agent
→ evidence

signal_agent
→ signal

finalize_output
→ signal + evidence reference

Never flatten away the relationship.

============================================================
28. RAG RETRIEVAL
============================================================

Continue using:

metadata/privacy filtering
+
dense retrieval
+
BM25
+
RRF/hybrid fusion
+
reranking

Do not send thousands of chunks to the LLM.

The important requirement is:

retrieved chunk
→ evidence
→ source reference

must remain intact.

============================================================
29. RAG QUERY ANSWERS
============================================================

For Evidence Ask:

USER QUESTION
↓
RAG retrieval
↓
LangGraph
↓
structured evidence
↓
answer

Response should be:

ANSWER

<answer>

EVIDENCE

<key evidence>

SOURCES

<source files + locations>

[View Evidence]
[Open Source]

If insufficient evidence:

INSUFFICIENT EVIDENCE

and explain what was missing.

============================================================
30. TRUTH ENGINE
============================================================

Truth Engine must produce:

SUPPORTED
CONTRADICTED
INSUFFICIENT_EVIDENCE

For:

SUPPORTED:

show evidence proving it.

For:

CONTRADICTED:

show what the evidence actually says.

For:

INSUFFICIENT:

state that evidence was insufficient.

EVERY RESULT MUST HAVE CLICKABLE SOURCE PROVENANCE.

============================================================
31. SOURCE TYPES
============================================================

Support provenance for:

PDF:
page number

CSV:
row / date

XLSX:
sheet + cell/row

DOCX:
page/section if available

TXT/MD:
line/section if available

JSON:
path/key if available

Do not force everything into "Page 1."

============================================================
32. RAW CHUNKS
============================================================

Raw chunks are technical evidence.

They should be available through:

View supporting excerpt

but should NOT be the primary UI.

Primary UI:

claim
metric
event
signal
risk
source

Secondary:

raw excerpt
chunk ID
technical metadata

============================================================
33. UI DESIGN REQUIREMENT
============================================================

Use this information hierarchy:

WHAT
↓
WHY
↓
PROOF
↓
SOURCE

Example:

WHAT:
API latency increased.

WHY:
Current P95 exceeds target.

PROOF:
365 ms → 370 ms.

SOURCE:
engineeringmetrics.csv
2026-08-24

[View Evidence]
[Open Source]

This should be consistent throughout the application.

============================================================
34. REMOVE NON-FUNCTIONAL CLICK TARGETS
============================================================

Find every evidence reference that looks clickable but is not.

Examples:

#ev_001
#ev_002
Evidence IDs
Source labels

Either:

make it functional

OR

display it as plain text.

NEVER visually imply a clickable action that does nothing.

============================================================
35. API CONTRACT TEST
============================================================

Every downstream endpoint must preserve provenance.

Examples:

GET signals
GET evidence
GET events
GET claims
GET DNA
GET radar
GET predictions
GET interventions

Inspect responses.

Verify the frontend can navigate:

signal → evidence
evidence → document
prediction → evidence
intervention → evidence
risk → signals → evidence

============================================================
36. DATABASE INTEGRITY
============================================================

Verify foreign keys / identifiers where possible:

signal.evidence_id
evidence.document_id
evidence.chunk_id
prediction.signal_id
intervention.signal_id

Avoid storing copied source names as the only relationship.

IDs should be authoritative.

============================================================
37. NO DUPLICATE EVIDENCE
============================================================

If the same source evidence is used by:

Signal
DNA
Radar
Prediction

reference the same evidence record.

Do NOT duplicate the entire evidence object unnecessarily.

============================================================
38. REAL SOURCE VERIFICATION
============================================================

For one live source:

Take:

fintech.pdf

or a current project document.

Verify:

Evidence
→ source_document_id
→ Open Source
→ actual file

Then verify the exact evidence exists in the file.

This is a hard acceptance criterion.

============================================================
39. TEST MULTIPLE DOCUMENTS
============================================================

Use at least:

1 narrative document
1 telemetry document
1 feedback document

Expected:

Narrative
→ Events / Claims

Telemetry
→ Metrics / Signals

Feedback
→ Claims / supporting signals where appropriate

Each should preserve its source.

============================================================
40. PRIVACY
============================================================

Every evidence/source lookup must enforce:

organization_id
project_id
privacy scope
authorization

Never allow:

Company B private evidence
→ Company A signal
→ Company A source access

Global intelligence must only use explicitly authorized/anonymized knowledge.

============================================================
41. FRONTEND PERFORMANCE
============================================================

Do not fetch the entire raw evidence corpus for every screen.

Fetch:

summary lists

Then fetch:

detailed evidence

when the user expands/clicks.

Do not rerun LangGraph on every tab.

============================================================
42. ERROR STATES
============================================================

Use truthful states:

NO_ANALYSIS
ANALYSIS_RUNNING
ANALYSIS_COMPLETE
INSUFFICIENT_EVIDENCE
SOURCE_UNAVAILABLE
UNAUTHORIZED
ANALYSIS_FAILED

Do not use fake values to fill empty states.

============================================================
43. CURRENT SCREEN-SPECIFIC FIXES
============================================================

SCREEN 1 — SIGNAL EXPLORER

Fix:

- generic "Observed anomaly"
- #ev_001 references
- non-clickable evidence
- missing detailed explanation

Show:

real signal
real metric/change
risk
trend
supporting evidence
source

------------------------------------------------------------

SCREEN 2 — FAILURE DNA

Fix:

- generic/missing rationale
- unsupported "Historical Correlation Verified"
- unexplained dimension score

Show:

dimension score
why
drivers
signals
evidence
historical status

------------------------------------------------------------

SCREEN 3 — FAILURE DNA DECOMPOSITION

Fix:

"No engine rationale was returned."

Replace with:

actual deterministic rationale

OR

"Insufficient evidence to explain this dimension."

Then show evidence drivers.

------------------------------------------------------------

SCREEN 4 — FAILURE RADAR

Fix:

Top failure risks currently appear without enough detail.

For every top risk show:

risk
score
severity
why
contributing signals
evidence
source
confidence

------------------------------------------------------------

SCREEN 5 — PREDICTION

Fix:

- unsupported narrative
- non-clickable evidence IDs
- missing explanation

Show:

prediction
probability only if supported
time window only if supported
why
signals
evidence
sources

============================================================
44. TEST THE EXACT USER JOURNEY
============================================================

Run:

UPLOAD DOCUMENT
↓
RAG INGESTION
↓
LANGGRAPH ANALYSIS
↓
EVIDENCE
↓
SIGNALS
↓
FAILURE DNA
↓
RADAR
↓
PREDICTION
↓
INTERVENTION

At every stage verify:

Can I answer:

"WHY DID THE SYSTEM SAY THIS?"

And:

"SHOW ME THE DOCUMENT THAT PROVES IT."

If any screen cannot answer those two questions, the implementation is not
complete.

============================================================
45. BROWSER CLICK-THROUGH TEST
============================================================

Perform this manually:

Signal
→ click evidence

Evidence
→ click source

Source
→ actual document

Then:

Failure DNA
→ click driver

Driver
→ evidence

Evidence
→ source

Then:

Radar risk
→ supporting signal

Signal
→ evidence

Evidence
→ source

Then:

Prediction
→ supporting evidence

Evidence
→ source

All paths must work.

============================================================
46. AUTOMATED TESTS
============================================================

Add tests for:

- evidence ID resolution
- evidence → document relationship
- clickable source URL generation
- document authorization
- signal provenance
- DNA provenance
- radar provenance
- prediction provenance
- intervention provenance
- missing evidence
- missing document
- unauthorized document
- stale evidence
- nonexistent evidence
- duplicate evidence
- no historical memory
- insufficient evidence
- source download

============================================================
47. GOLDEN END-TO-END ASSERTION
============================================================

Given:

Document D
Chunk C
Evidence E
Signal S
Risk R
Prediction P

assert:

S references E

E references D

E references C

R references S/E

P references S/E

and:

D can actually be opened by authorized user.

============================================================
48. FINAL ACCEPTANCE TABLE
============================================================

Return:

| Screen | Real Data | Explanation | Evidence Link | Source Link |
|---|---|---|---|---|
| Evidence | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Signals | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Failure DNA | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Radar | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Prediction | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Interventions | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Experiments | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Truth Engine | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |

============================================================
49. REQUIRED FINAL REPORT
============================================================

Return:

1. Exact provenance bug
2. Where evidence IDs were being converted/lost
3. Backend schema changes
4. API changes
5. Frontend changes
6. Source opening fix
7. RustFS/document access verification
8. Signal explanation fix
9. Failure DNA explanation fix
10. Radar explanation fix
11. Prediction explanation fix
12. Privacy verification
13. Historical memory verification
14. Tests added
15. Backend tests
16. Frontend build
17. Live browser click-through
18. Example complete chain

Include one real example:

QUESTION / SIGNAL:
...

EVIDENCE:
...

DOCUMENT:
...

LOCATION:
...

CLICK:
...

SOURCE:
...

HTTP:
200

ACTUAL DOCUMENT:
opened

============================================================
FINAL PRINCIPLE
============================================================

FailureOps must never ask the user to simply TRUST the system.

It must allow the user to VERIFY the system.

The fundamental chain is:

RAG
→ retrieved chunk
→ verified evidence
→ event / claim / metric
→ signal
→ risk
→ prediction
→ intervention

and at every step:

"SHOW ME THE EVIDENCE."

Every major intelligence statement must therefore be:

TRACEABLE
CLICKABLE
SOURCE-BACKED
PRIVACY-SAFE
NON-FABRICATED

The desired user experience is:

WHAT?
→ WHY?
→ PROOF?
→ SOURCE?

If the answer cannot be traced back to a real source document,
the UI must explicitly say:

INSUFFICIENT EVIDENCE.

Do not replace missing proof with generated text.

User scrolls sidebar down
        ↓
Clicks "Validated Learnings"
        ↓
Route changes
        ↓
Sidebar/component re-renders
        ↓
scrollTop resets to 0
        ↓
Sidebar jumps back to top