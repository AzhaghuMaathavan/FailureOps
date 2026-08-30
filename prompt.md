careflow was that registereed product, so dont ever hardcore

# Master Prompt: Fix Careflow Experiments & Interventions Pages (Mock Data → Real Backend)

## Context

Project: FailureOps (Project Failure Intelligence)
Broken pages:

- `/projects/careflow/experiment`
- `/projects/careflow/interventions`

Symptom: These pages render, but the data shown (cohort stats, priority scores, playbooks, action plans, etc.) is hardcoded/mock and not wired to a real backend. Buttons like **"Start cohort"**, **"Promote to experiment"**, and **"Run Analysis"** may not be functional. This needs to be fixed end-to-end: audit, remove all mock data, and connect every field/action to a real backend — creating the backend if it doesn't already exist.

## Your Task

### 1. Audit first — don't touch code blindly

- Find the frontend components/routes powering `/projects/careflow/experiment` and `/projects/careflow/interventions`.
- List every piece of data currently rendered on each page (status, N%, interim lift, stop rule, treatment/holdout text, experiment cards, hypothesis, cohort A/B definitions, priority scores, best lift, cost, conflict, playbooks, action plan checklists, etc.).
- For each piece of data, determine: is it (a) hardcoded in the component, (b) coming from a mock/fixture file, (c) coming from a stubbed API that returns static JSON, or (d) actually wired to a real DB/service?
- Do the same audit for every interactive action on the page (Start cohort, Promote to experiment, Run Analysis, checklist item toggles, search).
- Produce a short written inventory (as a code comment or a markdown scratch file) of what's mock vs real BEFORE making changes, so nothing is missed.

### 2. Design/confirm the backend

- Check if a backend service/API already exists for this project (look for an `/api`, `/server`, `/backend` directory, or existing route handlers/controllers).
- If it exists: identify the correct pattern (REST/GraphQL/tRPC, ORM, DB) already used elsewhere in the app and extend it — do not introduce a second, inconsistent pattern.
- If it does NOT exist for this feature: create it, matching the project's existing stack/conventions. At minimum you need:
  - **Data models / schema** for: Products, Failure DNA / Risk assessments, Experiments (cohort design: control/treatment, status, N, interim lift, stop rule/p-value, hypothesis, day window), Interventions/Playbooks (priority score, lift, cost, conflict, action plan steps + completion state), Cases/Historical Cases.
  - **Endpoints** to at least:
    - `GET /api/careflow/interventions` — list ranked playbooks with real computed priority/lift/cost/conflict.
    - `POST /api/careflow/interventions/:id/promote` — promote an intervention to an experiment (creates an Experiment record, returns it).
    - `GET /api/careflow/experiments` and `GET /api/careflow/experiments/:id` — real experiment state (status, N, interim lift, stop rule evaluation).
    - `POST /api/careflow/experiments/:id/start` — starts a cohort (flips status Planned → Running, sets start timestamp).
    - `PATCH /api/careflow/interventions/:id/action-items/:itemId` — toggle action plan step completion, persisted.
  - Proper auth/org scoping — data must be scoped to the logged-in org/tenant (e.g. "Aurora Technologies"), not global mock data.

### 3. Remove all mock data from the frontend

- Delete/retire mock JSON, fixture files, hardcoded arrays, and any `TODO: replace with API` stubs feeding these two pages.
- Replace with real data-fetching (React Query/SWR/fetch/whatever the app already standardizes on) hitting the endpoints above.
- Add proper loading, empty, and error states for each data section (cards should not silently show stale/fake numbers if the fetch fails).
- Wire every button to its real endpoint:
  - "Start cohort" → calls start endpoint, updates status live.
  - "Promote to experiment" → calls promote endpoint, navigates to the new experiment.
  - "Run Analysis" → calls whatever analysis/compute job exists (or stub it clearly as **"not yet implemented"** in the UI if that backend piece genuinely doesn't exist yet — do not fake success).
  - Action plan checkboxes → persist toggle state via API, not local component state only.

### 4. Never fake success

- If a backend capability genuinely can't be built in this pass (e.g., the actual statistical engine behind "Run Analysis" / p-value computation), do not mock it silently. Instead:
  - Implement the plumbing (endpoint, DB write, UI wiring) for real.
  - Clearly mark any placeholder computation (e.g., a naive interim-lift calculation) as such in code comments, and flag it to me explicitly in your summary — don't leave it looking indistinguishable from real analytics.

### 5. Verification

- After wiring, manually trace one full flow: create/seed a real product + failure case → see it produce an intervention via real computation → promote it to an experiment → start the cohort → confirm N/status/interim lift update from real DB state, not from a mock.
- Confirm the sidebar's live risk badge ("33% risk · Pre-Launch Adoption...") and Historical Cases/Global Dashboard also pull from the same real data source if they show related figures, so numbers stay consistent across pages instead of drifting between real and mock sources.
- Run existing tests/linters; add basic tests for the new endpoints (happy path + one failure path each).

### 6. Report back

When done, give me:

1. A list of every endpoint you added/changed, with method + path.
2. A list of every mock data source you removed.
3. Anything you could NOT fully connect to a real backend (and why), so I know what's still a placeholder.
4. Any schema/migration changes made.

## Constraints

- Match existing code style, folder structure, and libraries already used in the repo — don't introduce a new framework/ORM/state-management library just for this fix.
- Don't remove or break other working pages/features while doing this.
- Don't fabricate data to make the UI "look" populated — empty/loading states are fine and expected until real data exists.
