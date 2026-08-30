MASTER FORENSIC FIX — CONNECT DOWNSTREAM FAILUREOPS PAGES TO REAL BACKEND DATA

PROJECT:
FailureOps X

OBJECTIVE:
The downstream pages currently render UI but are not reliably functioning as
a complete data-driven workflow.

Affected areas:

1. What-If Simulation
2. Experiments
3. Outcome Verification
4. Organizational Memory
5. Any downstream pages that depend on the above

IMPORTANT:
Do NOT fake data.
Do NOT hardcode current project values.
Do NOT create placeholder-success states.
Do NOT delete existing features.
Do NOT replace working LangGraph/RAG functionality.

The goal is to make the downstream FailureOps workflow actually consume,
execute, persist, and display real backend state.

============================================================
0. FIRST — FORENSIC AUDIT, NO CODE CHANGES
============================================================

Before changing anything, trace the existing architecture:

Project
→ Documents
→ RAG
→ LangGraph Intelligence
→ Evidence
→ Events / Claims
→ Signals
→ Risk
→ Failure DNA
→ Causal / Prediction
→ What-If
→ Interventions
→ Experiments
→ Outcomes
→ Organizational Memory

For each downstream page determine:

A. What API endpoint does it call?
B. Does the backend endpoint exist?
C. Does the endpoint return real DB state?
D. Is frontend rendering actual response data?
E. Is any mock/demo/fallback data being used?
F. Is there a missing persistence step?
G. Is there a missing state transition?
H. Is there a broken ID/reference between stages?

Do not modify until the exact breakpoints are identified.

============================================================
1. REQUIRED ARCHITECTURAL CONTRACT
============================================================

The downstream chain must be:

REAL ANALYSIS
↓
STRUCTURED INTELLIGENCE
↓
FAILURE DNA
↓
CAUSAL / FAILURE PATTERN
↓
PREDICTION
↓
INTERVENTION PLAN
↓
WHAT-IF SIMULATION
↓
EXPERIMENT
↓
MEASUREMENT
↓
OUTCOME VERIFICATION
↓
VALIDATED MEMORY

Every stage must consume the previous stage's persisted output.

No stage may silently invent its own state.

============================================================
2. ANALYSIS RESULT MUST BE THE SOURCE OF TRUTH
============================================================

The latest completed project analysis must produce/persist a canonical
analysis object containing identifiers such as:

project_id
organization_id
analysis_id
evidence
signals
risk
failure_dna
predicted_failure
causal_relationships
interventions
experiments
outcomes

Use the actual existing schema where available.

Do NOT create a second parallel truth model.

============================================================
3. WHAT-IF SIMULATION
============================================================

The What-If Simulation page must NOT use hardcoded scenarios.

Scenarios must be generated from real current project state.

For example:

Current risk
↓
Current signals
↓
Current failure trajectory
↓
Intervention candidate
↓
Projected effect

Required fields:

scenario_id
project_id
analysis_id
scenario_name
scenario_type
assumptions
affected_signals
baseline_risk
projected_risk
delta
confidence
created_at
status

============================================================
4. WHAT-IF SCENARIOS MUST BE DYNAMIC
============================================================

Do NOT hardcode:

"Freeze Scope"
"Streamline Onboarding"
"Fix CI Failures"

These names may exist in current demo content, but future projects may
have completely different failure patterns.

Instead derive intervention candidates from the actual intervention engine.

Example:

Signal:
high latency

Potential intervention:
reduce request load / optimize service / increase capacity

The actual intervention names must come from backend logic.

============================================================
5. WHAT-IF EXECUTION
============================================================

When user selects a scenario and clicks:

Run selected

the system must:

1. validate scenario
2. load current project intelligence
3. apply scenario assumptions
4. run deterministic simulation
5. generate projected metrics/risk
6. persist simulation result
7. return structured result
8. update UI

Do NOT just change UI text.

============================================================
6. DETERMINISTIC SIMULATION
============================================================

Where simulation can be mathematical, keep it deterministic.

Do NOT invoke an LLM simply to calculate numeric deltas.

Use:

current state
+
scenario assumptions
→
simulation function
→
projected state

If a model is required for qualitative interpretation, isolate it from
numeric calculation.

============================================================
7. EXPERIMENTS
============================================================

The Experiments page must represent an actual executable experiment.

Every experiment needs:

experiment_id
project_id
analysis_id
intervention_id
hypothesis
control_group
treatment_group
target_metric
baseline_value
success_threshold
duration
status
created_at

Statuses should be real lifecycle states:

PLANNED
RUNNING
COMPLETED
STOPPED
FAILED

Do not display PLANNED forever.

============================================================
8. START COHORT MUST WORK
============================================================

When user clicks:

Start cohort

the backend must create/start the experiment.

Required behavior:

PLANNED
↓
STARTING
↓
RUNNING

Persist the state.

Frontend should poll or subscribe to the real state.

Do NOT simulate progress with timers only.

============================================================
9. CONTROL / TREATMENT COHORT
============================================================

The experiment must distinguish:

CONTROL
vs
TREATMENT

Each must have:

cohort_id
assignment
baseline metric
post-intervention metric
sample size
measurement window

If the product currently cannot run real user-level cohort assignment,
implement a safe deterministic simulation mode and clearly label it as
SIMULATED.

Do not falsely claim real-world experimental execution.

============================================================
10. MEASUREMENT
============================================================

Experiments need actual measurement.

Define:

measurement_source
metric_name
baseline_value
current_value
delta
period
confidence

Measurement must use real project telemetry or explicitly configured test
data.

No placeholder numbers.

============================================================
11. OUTCOME VERIFICATION
============================================================

This is currently the biggest broken downstream area.

The Outcome Verification page shows:

"No Verified Outcomes Recorded Yet"

That is acceptable ONLY if no experiment has actually completed.

But there must be a working path:

Experiment
↓
Measurement collected
↓
Outcome generated
↓
Verification
↓
Outcome persisted

When an experiment completes, create a real outcome record.

Required fields:

outcome_id
experiment_id
project_id
intervention_id
baseline_metric
post_metric
absolute_change
percentage_change
success
confidence
attribution
verified_at
evidence_ids
status

============================================================
12. OUTCOME VERIFICATION RULE
============================================================

Do not mark an intervention successful because the metric moved.

Verification must evaluate:

Did the observed movement meet the pre-registered success criteria?

Example:

Target:
reduce API P95 below threshold

Baseline:
370 ms

Observed:
240 ms

Success:
TRUE

Only if the configured experiment rule says that this constitutes success.

Do not hardcode the threshold.

============================================================
13. ATTRIBUTION
============================================================

Outcome Verification should distinguish:

SUCCESSFULLY ATTRIBUTED
PARTIALLY ATTRIBUTED
NOT ATTRIBUTED
INSUFFICIENT EVIDENCE

Do not claim causal attribution from simple correlation.

Use appropriate confidence.

============================================================
14. EVIDENCE FOR OUTCOMES
============================================================

Every outcome must point back to supporting evidence where available:

document
metric observation
signal
experiment measurement

The UI should show:

Outcome:
Intervention reduced API latency.

Evidence:
Baseline: ...
Post-intervention: ...

Source:
engineeringmetrics.csv / relevant telemetry

Confidence:
...

Do not show unsupported claims.

============================================================
15. WRITE TO MEMORY
============================================================

The:

Write to memory

button must actually persist validated learning.

Do NOT write every outcome automatically.

Only validated/eligible outcomes should enter organizational memory.

Memory record:

memory_id
organization_scope
project_scope
failure_pattern
intervention
outcome
confidence
evidence_refs
privacy_scope
created_at

============================================================
16. PRIVATE VS GLOBAL MEMORY
============================================================

Preserve your existing privacy model.

Private project memory:

Only authorized users in that project/company can access it.

Global memory:

Only explicitly authorized/opted-in anonymized information may become
globally searchable.

Never expose raw company-private documents to another organization.

============================================================
17. FAILURE DNA
============================================================

Failure DNA displayed downstream must come from actual signals.

Do NOT hardcode:

Technical Risk = ...
Execution Risk = ...

Compute from the real FailureOps scoring engine.

============================================================
18. FAILURE RADAR
============================================================

Failure Radar must use:

current risk
risk trend
critical signals
predicted failure
confidence
supporting evidence

and remain linked to analysis_id.

If there is no completed analysis:

show a meaningful empty state.

Do not show fake risk.

============================================================
19. PREDICTED FAILURE
============================================================

Prediction must have:

prediction_id
analysis_id
failure
confidence
supporting_signals
supporting_evidence
created_at

Do NOT hardcode a prediction like:

"Missed Release"

unless the actual engine produced it.

============================================================
20. CAUSAL ANALYSIS
============================================================

Causal graph must come from real signal relationships.

Example:

Signal A
→ Cause B
→ Effect C
→ Consequence D

Persist:

relationship_id
source_signal
target_signal
relationship_type
confidence
evidence_refs

Do not create graph nodes simply to make the UI populated.

============================================================
21. PAGE LOAD CONTRACT
============================================================

Every downstream page must:

1. identify current project
2. load latest completed analysis
3. load stage-specific persisted output
4. render real backend state
5. handle empty state correctly

No page should depend on:

window/localStorage demo objects
hardcoded JSON
static scenario arrays
fake timers
placeholder IDs

unless explicitly marked as development fixture mode.

============================================================
22. FRONTEND API CONTRACT
============================================================

Audit all downstream frontend API calls.

Find mismatches like:

Backend:
GET /simulations/{project_id}

Frontend expects:
response.simulations

or:

Backend returns:
project_analysis_id

Frontend expects:
analysis_id

Normalize API contracts at a single API client layer.

Do not scatter transformations throughout components.

============================================================
23. EMPTY STATES
============================================================

Correct empty state:

"No completed experiment yet."

NOT:

"No verified outcomes"

while an experiment is actually completed.

Likewise:

"No simulation has been executed yet."

is correct if none exists.

Do not hide backend errors as empty states.

============================================================
24. ERROR HANDLING
============================================================

The current UI should distinguish:

LOADING
READY
RUNNING
COMPLETED
FAILED
BLOCKED
NO DATA

Do not turn HTTP/API failures into:

"no data"

Always surface an actionable error.

============================================================
25. RATE LIMITS / RETRIES
============================================================

Earlier the system experienced 429 rate-limit failures.

Downstream pages must not create unnecessary LLM calls.

What-If Simulation:
NO LLM required for deterministic numerical propagation.

Experiment state:
NO LLM required.

Outcome verification:
NO LLM required for deterministic measurement comparison.

Only use LLM when semantic interpretation is actually necessary.

Implement safe retry/backoff where external model calls are required.

Never fire duplicate requests because React re-rendered.

============================================================
26. POLLING
============================================================

Current pages should not create uncontrolled polling loops.

Implement one shared polling mechanism:

- bounded interval
- cleanup on unmount
- stop when terminal status reached
- exponential backoff where appropriate
- no duplicate concurrent requests

For completed analysis:

polling stops.

============================================================
27. IDS AND RELATIONSHIPS
============================================================

Everything must remain linked:

project_id
→ analysis_id
→ signal_id
→ prediction_id
→ intervention_id
→ simulation_id
→ experiment_id
→ outcome_id
→ memory_id

No orphan downstream records.

============================================================
28. DATABASE PERSISTENCE
============================================================

Inspect current DB models first.

Reuse existing tables if possible.

Do NOT create duplicate tables if equivalent tables already exist.

Add migrations only when required.

Ensure foreign-key/reference integrity.

============================================================
29. SECURITY
============================================================

Every endpoint must enforce:

organization_id
project_id
authorized user

No IDOR.

A user from organization B must not be able to request:

simulation from organization A
experiment from organization A
outcome from organization A
memory from organization A

Return appropriate authorization failure.

============================================================
30. AUDIT LOGGING
============================================================

Important state-changing actions should be traceable:

run analysis
run simulation
start experiment
complete experiment
verify outcome
write memory

Store actor/project/action/timestamp where the current architecture supports
audit logging.

============================================================
31. UI — WHAT-IF SIMULATION
============================================================

The page should show:

CURRENT STATE
↓
AVAILABLE INTERVENTIONS
↓
SELECT SCENARIO
↓
PROJECTED IMPACT
↓
RUN SIMULATION
↓
RESULT

Example result:

Baseline Risk: 43
Scenario: <dynamic>
Projected Risk: 27
Change: -16
Major affected signals: ...
Confidence: ...

No static numbers.

============================================================
32. UI — EXPERIMENTS
============================================================

The page should show:

Experiment
Hypothesis
Control
Treatment
Target metric
Baseline
Target
Duration
Status
Observed result

Buttons:

Start
Pause / Stop
Complete
depending on valid state.

Disable invalid state transitions.

============================================================
33. UI — OUTCOME VERIFICATION
============================================================

When no verified outcome exists:

No verified outcomes yet.

Then provide:

[Open Experiments]

When an outcome exists:

OUTCOME
Intervention:
...

RESULT
Baseline → Post

Change
...

VERDICT
SUCCESS / PARTIAL / FAILED / INSUFFICIENT EVIDENCE

CONFIDENCE
...

EVIDENCE
...

[Write to Memory]

============================================================
34. UI — ORGANIZATIONAL MEMORY
============================================================

Show validated learnings only.

Example:

Failure Pattern
API latency degradation

Intervention
...

Outcome
...

Evidence
...

Confidence
...

Scope
Private / Authorized Global

============================================================
35. IMPORTANT — CURRENT SCREENSHOT BEHAVIOR
============================================================

The following observed behaviors must be investigated and corrected:

A. What-If Simulation displays existing scenarios but must prove they are
dynamic/backend-generated.

B. Experiments displays a planned experiment but must provide a real lifecycle.

C. Outcome Verification shows no verified outcomes; determine whether this is
correct empty state or a missing persistence/verification path.

D. Downstream pages must not rely on disconnected mock/demo data.

============================================================
36. LIVE END-TO-END TEST
============================================================

After implementation perform this sequence against a real project:

1. Upload real project documents.
2. Wait until ingestion is READY.
3. Run intelligence analysis.
4. Confirm analysis completed.
5. Confirm signals exist.
6. Confirm risk exists.
7. Confirm failure pattern/prediction exists where evidence supports it.
8. Generate intervention plan.
9. Generate What-If scenario.
10. Run What-If simulation.
11. Confirm persisted simulation.
12. Create experiment.
13. Start experiment.
14. Collect/derive measurement from real test telemetry.
15. Complete experiment.
16. Generate outcome.
17. Verify outcome against pre-registered success rule.
18. Persist outcome.
19. Write validated outcome to memory.
20. Confirm memory can be retrieved.

============================================================
37. SECOND TEST — NO DATA
============================================================

Create a fresh project with no analysis.

Expected:

What-If:
No simulation data yet.

Experiments:
No experiments yet.

Outcomes:
No verified outcomes yet.

Memory:
No validated learning yet.

No fake values.

============================================================
38. THIRD TEST — FAILURE CASE
============================================================

Create or use a project where the intervention does not improve the target.

Expected:

Experiment completes.

Outcome:

FAILED or NOT ATTRIBUTED

not SUCCESS.

This is critical for proving the system can learn from failure as well.

============================================================
39. FOURTH TEST — PRIVACY
============================================================

Create:

Organization A
Project A

Organization B
Project B

Verify:

A cannot read B's:

analysis
signals
simulation
experiments
outcomes
memory

and vice versa.

============================================================
40. NO HARDCODING
============================================================

Absolutely no hardcoded:

project names
metric values
risk scores
predictions
scenario names
experiment results
outcome values
document names
IDs
timestamps

may be introduced.

Static enum values are acceptable only when they are true product contracts.

============================================================
41. TEST SUITE
============================================================

Add backend tests for:

- simulation creation
- simulation execution
- simulation persistence
- experiment creation
- lifecycle transitions
- measurement persistence
- outcome generation
- outcome verification
- memory write
- project isolation
- organization isolation
- invalid state transitions
- empty-state correctness
- no fake fallback values

Frontend tests:

- page loading
- API error states
- empty states
- real data rendering
- state transitions
- button actions
- no duplicate requests

============================================================
42. PERFORMANCE
============================================================

Do not call the LLM for:

numeric simulation
experiment state
percentage calculation
risk arithmetic
outcome comparison

Reuse existing persisted analysis wherever possible.

Use caching/read-through where appropriate.

============================================================
43. OBSERVABILITY
============================================================

Expose stage status to UI:

Analysis
Simulation
Experiment
Measurement
Verification
Memory

with timestamps and terminal states.

Do not fake progress percentages.

============================================================
44. FINAL ACCEPTANCE CRITERIA
============================================================

The complete workflow must work as:

DOCUMENTS
↓
RAG
↓
LANGGRAPH
↓
EVIDENCE
↓
SIGNALS
↓
RISK
↓
FAILURE PATTERN
↓
PREDICTION
↓
INTERVENTION
↓
WHAT-IF
↓
EXPERIMENT
↓
MEASUREMENT
↓
OUTCOME
↓
MEMORY

Every arrow must correspond to a real backend contract and persisted state.

============================================================
45. REQUIRED FINAL REPORT
============================================================

Return a forensic report containing:

1. Current architecture
2. Exact broken links
3. Mock/static data found
4. Missing APIs
5. Missing persistence
6. Missing state transitions
7. Exact backend changes
8. Exact frontend changes
9. DB/migration changes
10. Security changes
11. Tests added
12. Backend test results
13. Frontend test/build results

Then provide a live acceptance table:

Stage | Input | Output | Persisted | UI Verified

Analysis
Signals
Failure DNA
Prediction
Intervention
Simulation
Experiment
Measurement
Outcome
Memory

Also explicitly state:

- which parts are REAL
- which parts are deterministic
- which parts use LLM
- which parts are simulated/test-only
- which parts remain unavailable until real external data exists

DO NOT claim a downstream capability is working merely because its page
renders.

A capability is "working" only when:

USER ACTION
→ BACKEND REQUEST
→ REAL PROCESSING
→ REAL DB STATE CHANGE
→ REAL RESPONSE
→ UI UPDATE

============================================================
FINAL GOAL
============================================================

FailureOps must feel like one connected intelligence system, not a collection
of visually complete pages.

The user should be able to move naturally from:

"What is going wrong?"
→
"Why?"
→
"What will happen?"
→
"What should we do?"
→
"What if we do it?"
→
"Did it work?"
→
"What did we learn?"

and every answer must be traceable to real backend state and evidence.