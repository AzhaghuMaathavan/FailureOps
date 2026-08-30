# FAILUREOPS X — UPLOAD PAGE FIX
## Issues: Duplicate Panels · Poll Budget Error · Parser Status Inconsistency
## Page: `/projects/:projectId/upload`

---

## EXACT ISSUES OBSERVED (from screenshots)

### Issue 1 — DUPLICATE PIPELINE PANELS on the same page

The upload page currently renders **two separate panels** showing the same
pipeline data side by side on one scroll:

```
┌─────────────────────────────────────────────────────┐
│  LangGraph flow                    (top panel)       │
│  Document upload | Parser | Chunker | Embedding      │
│  Vector storage | Semantic search | Agent1 | Agent2  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Pipeline Health                   (bottom panel)    │
│  8 of 9 stages complete                              │
│  Document received ✓ | Stored in RustFS ✓ | Parser…  │
│  Embedding ✓ | Vector storage ✓ | Retrieval ✓ | …    │
└─────────────────────────────────────────────────────┘
```

**These are not two different things.** They track the same job.
The page must show **one unified pipeline status view**, not two.

### Issue 2 — Poll Budget Error: `RAG ingest exceeded the poll budget`

Exact error message shown:
```
RAG ingest exceeded the poll budget (parser / chunker / embedding).
```

- Semantic search stage reaches 48 chunks retrieved then **times out**
- Agent 1 · Evidence and Agent 2 · Signal never run (stay "Waiting")
- The pipeline fails after 161 seconds (total 161.1 s)
- Root cause: the RAG ingest poller has a fixed budget that 6-chunk
  documents are hitting — meaning the poll interval or timeout is
  misconfigured, not the document size

### Issue 3 — Parser spinner inconsistency

In the successful run (image 2):
- **8 of 9 pipeline stages complete** is shown
- But **Parser** still shows a spinning/in-progress indicator
- Parser substage should have already completed if chunks and embeddings
  are done — its status is not being updated when downstream stages finish

### Issue 4 — Stage timing shown in LangGraph top panel but not in Pipeline Health

The bottom Pipeline Health panel shows real elapsed times per stage
(`119.7 s`, `38.8 s`, etc.) but the top LangGraph panel shows no timings —
they are parallel rendering the same job with different levels of detail.

---

## FIX PLAN

---

## PART 1 — REMOVE THE DUPLICATE PANEL

### 1.1 Find the duplicate

Search the upload page component for both panels:

```bash
# Find the component that renders the upload page
grep -r "LangGraph flow\|Pipeline Health\|PipelineHealth\|LangGraphFlow\|LangGraphPanel" \
  frontend/src --include="*.tsx" --include="*.jsx" -l

# Find where both are rendered together
grep -r "PipelineHealth\|LangGraphFlow\|LangGraphPanel\|pipeline-health\|langgraph-flow" \
  frontend/src/pages --include="*.tsx" -n
```

### 1.2 What to keep vs remove

**Keep:** The `Pipeline Health` panel (bottom).
- It shows real elapsed times per stage
- It shows the correct per-stage counts (chunks, embeddings, vectors)
- It shows the `RAG reachable · DB: connected · rustfs: connected` status bar
- It shows `N of M pipeline stages complete` progress label

**Remove / consolidate:** The `LangGraph flow` panel (top).
- It duplicates the same stages with less information
- It shows "Waiting" for all stages even when Pipeline Health shows them complete
- It is a visual summary that is already covered by Pipeline Health

**OR:** If LangGraph panel is intentionally a lightweight "current-phase"
indicator and Pipeline Health is the detailed breakdown, **merge them into one
component** with a compact header and expanded stage grid underneath.

### 1.3 The correct single-panel layout

```tsx
// One unified component: PipelineStatusPanel

<PipelineStatusPanel>
  {/* Header row */}
  <PanelHeader>
    <PanelTitle>LangGraph Pipeline</PanelTitle>
    <PanelSubtitle>Upload → RAG → Evidence agent → Signal agent</PanelSubtitle>
    <PanelStatus>
      {/* Current phase label + elapsed + connection badges */}
      {job.status === 'RUNNING' && <span>Current phase: {job.current_phase} · {job.elapsed_ms} ms</span>}
      {job.status === 'FAILED'  && <span className="error">Run failed · total {job.elapsed_ms} ms</span>}
      {job.status === 'DONE'    && <span className="success">Complete · {job.elapsed_ms} ms</span>}
      <Badge>RAG reachable</Badge>
      <Badge>DB: connected</Badge>
      <Badge>rustfs: connected</Badge>
    </PanelStatus>
  </PanelHeader>

  {/* Error banner — only shown on failure */}
  {job.error && (
    <ErrorBanner>{job.error}</ErrorBanner>
  )}

  {/* Progress label */}
  <ProgressLabel>
    {completedStages} of {totalStages} pipeline stages complete
  </ProgressLabel>

  {/* Single stage grid — one card per stage */}
  <StageGrid>
    {stages.map(stage => <StageCard key={stage.id} stage={stage} />)}
  </StageGrid>

  {/* Document table — shown after upload completes */}
  {job.documents?.length > 0 && (
    <DocumentTable documents={job.documents} />
  )}
</PipelineStatusPanel>
```

### 1.4 Exact code change pattern

```tsx
// BEFORE (in UploadPage.tsx or equivalent):
return (
  <PageLayout>
    <DropZone />
    <StatRow />               {/* Queued / Ready / Rejected / Quota */}

    <LangGraphFlowPanel       {/* ← REMOVE THIS */}
      jobId={jobId}
      stages={langraphStages}
    />

    <PipelineHealthPanel      {/* ← KEEP THIS, rename if needed */}
      jobId={jobId}
    />
  </PageLayout>
)

// AFTER:
return (
  <PageLayout>
    <DropZone />
    <StatRow />

    {/* ONE unified panel — shows both summary and detail */}
    <PipelineStatusPanel
      jobId={jobId}
      showConnectionBadges
      showDocumentTable
    />
  </PageLayout>
)
```

---

## PART 2 — FIX THE POLL BUDGET ERROR

### 2.1 What the error means

```
RAG ingest exceeded the poll budget (parser / chunker / embedding)
```

The RAG service polls a job status endpoint while waiting for parser →
chunker → embedding to complete. It hits a **poll count limit** before
those stages respond as done, then aborts.

This is NOT about document size (6 chunks is tiny).
This IS about: either the **poll interval is too short**, the **poll limit
is too low**, or the **RAG service returns "in progress" too long** before
confirming stage completion.

### 2.2 Find the poll budget

```bash
# Find where the poll budget / poll limit is defined
grep -rn "poll_budget\|poll_limit\|POLL_BUDGET\|POLL_LIMIT\|maxPolls\|max_polls\|pollBudget" \
  --include="*.py" --include="*.ts" --include="*.js" --include="*.env" \
  --include="*.toml" --include="*.yaml" --include="*.yml" .

# Find where the timeout / poll interval is configured
grep -rn "poll_interval\|POLL_INTERVAL\|pollInterval\|ingest_timeout\|INGEST_TIMEOUT\|ingest_poll" \
  --include="*.py" --include="*.ts" . 

# Find where "exceeded the poll budget" message is generated
grep -rn "exceeded the poll budget\|poll budget\|poll_budget" \
  --include="*.py" --include="*.ts" --include="*.js" .
```

### 2.3 Fix the poll budget parameters

Once found, apply these changes based on what structure exists:

#### If it is a Python constant:

```python
# BEFORE (too tight):
INGEST_POLL_BUDGET    = 30   # max number of poll attempts
INGEST_POLL_INTERVAL  = 2.0  # seconds between polls
# Total wait budget = 30 × 2s = 60s — not enough for slow chunker

# AFTER:
INGEST_POLL_BUDGET    = 90   # max number of poll attempts
INGEST_POLL_INTERVAL  = 3.0  # seconds between polls
# Total wait budget = 90 × 3s = 270s — enough for normal ingestion
# (The observed failure was at 161s, so 180s+ is needed as minimum)
```

#### If it is a TypeScript/Node constant:

```typescript
// BEFORE:
const INGEST_POLL_MAX_ATTEMPTS = 30
const INGEST_POLL_INTERVAL_MS  = 2000

// AFTER:
const INGEST_POLL_MAX_ATTEMPTS = 90
const INGEST_POLL_INTERVAL_MS  = 3000
```

#### If it is in `.env` / config:

```env
# .env or config file
# BEFORE:
RAG_POLL_BUDGET=30
RAG_POLL_INTERVAL=2

# AFTER:
RAG_POLL_BUDGET=90
RAG_POLL_INTERVAL=3
```

### 2.4 Add exponential backoff to the poller

**Do not just increase the flat budget.** Also add backoff so quick jobs
finish fast and slow jobs get time:

```python
# langgraph_service/rag/ingest_poller.py (or equivalent)

import asyncio

async def poll_ingest_completion(
    job_id: str,
    *,
    max_attempts: int = 90,
    base_interval: float = 2.0,
    max_interval: float = 10.0,
    backoff_factor: float = 1.3,
) -> IngestResult:
    """
    Poll RAG ingest status with exponential backoff.
    Never blocks the event loop.
    """
    interval = base_interval
    for attempt in range(max_attempts):
        status = await get_ingest_status(job_id)

        if status.phase in ("COMPLETED", "DONE"):
            return status

        if status.phase == "FAILED":
            raise IngestFailedError(status.error)

        # Back off — but cap at max_interval
        await asyncio.sleep(interval)
        interval = min(interval * backoff_factor, max_interval)

    raise PollBudgetExceededError(
        f"RAG ingest job {job_id} did not complete within "
        f"{max_attempts} attempts "
        f"(~{int(max_attempts * max_interval / 2)}s max wait)."
    )
```

### 2.5 Make the error message actionable

When the poll budget is exceeded, the current error shown is:
```
RAG ingest exceeded the poll budget (parser / chunker / embedding).
```

This is accurate but gives the user no next step. Fix the UI to show:

```tsx
// In the error banner component:

if (error?.code === 'POLL_BUDGET_EXCEEDED' || error?.message?.includes('poll budget')) {
  return (
    <ErrorBanner severity="warning">
      <ErrorTitle>Ingestion taking longer than expected</ErrorTitle>
      <ErrorDetail>
        The pipeline is still processing your documents but the status
        check timed out. Your documents ({uploadedCount}) were received
        and are being processed — this can take 2–5 minutes for larger files.
      </ErrorDetail>
      <ErrorActions>
        <button onClick={recheckStatus}>Check status</button>
        <button onClick={retryIngestion}>Retry ingestion</button>
      </ErrorActions>
    </ErrorBanner>
  )
}
```

### 2.6 Add a "Retry ingestion" button that does NOT re-upload

When the poll budget fails:
- The documents were already received (✓ in Document upload stage)
- The documents were already stored in RustFS (✓ Stored in RustFS)
- Parser / Chunker / Embedding completed (✓ in failed run screenshot)
- Only Semantic search and Agents failed to confirm

So retry should call a **resume-from-stage** endpoint, not re-upload:

```typescript
// Backend: POST /api/projects/:projectId/ingest/resume
// Body: { job_id, from_stage: 'semantic_search' }

// Frontend:
async function retryIngestion() {
  const res = await fetch(
    `/api/projects/${projectId}/ingest/resume`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        job_id: currentJobId,
        from_stage: 'semantic_search',
      }),
    }
  )
  const { job_id } = await res.json()
  startPolling(job_id)   // Resume polling the new/resumed job
}
```

If resume-from-stage is not yet implemented, at minimum call the existing
analysis endpoint with the already-stored document IDs (do not re-upload).

---

## PART 3 — FIX PARSER SPINNER INCONSISTENCY

### 3.1 The bug

In image 2 (8 of 9 stages complete):
- Embedding ✓, Vector storage ✓, Retrieval ✓, Evidence Agent ✓, Signal Agent ✓
- **Parser** still shows a spinning/in-progress indicator

Parser is an **upstream** stage. If Chunking is ✓ and Embedding is ✓,
Parser must already be complete. Its status is not being updated correctly.

### 3.2 Root cause patterns to check

```bash
# Find the stage status update logic
grep -rn "parser\|PARSER\|Parser" frontend/src --include="*.tsx" \
  | grep -i "status\|state\|complete\|done\|spinner"

# Find if Parser status is derived or fetched independently
grep -rn "stageStatus\|stage_status\|StageStatus" \
  frontend/src --include="*.tsx" -n
```

**Likely cause A:** Parser status is polled from a separate endpoint that
returns stale "in-progress" even when downstream stages are done.

**Likely cause B:** Parser state is stored in local component state and
was set to "in-progress" when it started, but the "completed" transition
is missed because the poll that would confirm it was consumed by a later
poller.

**Likely cause C:** The stage grid derives status from the job's
`current_phase` field. When `current_phase` moves to "chunking", Parser
becomes "complete", but when `current_phase` moves back to a polling
retry, Parser reverts to "in-progress".

### 3.3 Fix: Stage status must be monotonic (never regress)

```typescript
// stageReducer.ts (or wherever stage state is managed)

type StageState = 'waiting' | 'in_progress' | 'complete' | 'error' | 'warning'

// Stage completion order — a stage cannot regress once it advances
const STAGE_ORDER: StageState[] = ['waiting', 'in_progress', 'complete']

function stageReducer(current: StageState, next: StageState): StageState {
  // Never let a stage go backward: complete → in_progress is illegal
  const currentIdx = STAGE_ORDER.indexOf(current)
  const nextIdx    = STAGE_ORDER.indexOf(next)

  // Error and warning always win regardless of order
  if (next === 'error' || next === 'warning') return next

  // Do not regress from complete
  if (current === 'complete' && next !== 'error' && next !== 'warning') {
    return 'complete'
  }

  return nextIdx > currentIdx ? next : current
}
```

### 3.4 Fix: Infer upstream stage completion from downstream progress

If stage N is `complete`, all stages before N are also `complete`:

```typescript
// pipelineStatusHelpers.ts

const PIPELINE_STAGES_ORDERED = [
  'document_received',
  'stored_in_rustfs',
  'parser',
  'chunking',
  'embedding',
  'vector_storage',
  'retrieval',
  'evidence_agent',
  'signal_agent',
] as const

type PipelineStage = typeof PIPELINE_STAGES_ORDERED[number]

/**
 * Given a raw stages map from the backend, propagate completion:
 * if stage[N] is complete, mark all stages[0..N-1] as complete.
 */
export function propagateCompletion(
  stages: Record<PipelineStage, StageState>
): Record<PipelineStage, StageState> {
  const result = { ...stages }

  // Find the highest index that is 'complete'
  let lastCompleteIdx = -1
  for (let i = 0; i < PIPELINE_STAGES_ORDERED.length; i++) {
    if (result[PIPELINE_STAGES_ORDERED[i]] === 'complete') {
      lastCompleteIdx = i
    }
  }

  // Mark all stages before it as complete
  for (let i = 0; i < lastCompleteIdx; i++) {
    const stage = PIPELINE_STAGES_ORDERED[i]
    if (result[stage] !== 'error' && result[stage] !== 'warning') {
      result[stage] = 'complete'
    }
  }

  return result
}
```

Apply `propagateCompletion` before rendering the stage grid:

```tsx
// In PipelineStatusPanel.tsx:
const correctedStages = useMemo(
  () => propagateCompletion(rawStages),
  [rawStages]
)
// Render correctedStages, not rawStages
```

---

## PART 4 — FIX POLLING ARCHITECTURE (prevent repeat calls)

The upload page currently has:
- A poller for the LangGraph flow panel
- A possibly separate poller for the Pipeline Health panel
- Both poll on the same job, causing double the API calls

### 4.1 Single poller, shared state

```typescript
// hooks/usePipelineJob.ts

import { useEffect, useRef, useState, useCallback } from 'react'

const POLL_INTERVAL_MS = 3000
const MAX_TERMINAL_POLL_COUNT = 2   // stop after confirming terminal state

interface PipelineJobState {
  jobId: string | null
  status: 'IDLE' | 'RUNNING' | 'COMPLETE' | 'FAILED'
  stages: Record<string, StageDetail>
  documents: DocumentRecord[]
  error: string | null
  elapsedMs: number
  currentPhase: string | null
}

export function usePipelineJob(projectId: string) {
  const [state, setState] = useState<PipelineJobState>({
    jobId: null,
    status: 'IDLE',
    stages: {},
    documents: [],
    error: null,
    elapsedMs: 0,
    currentPhase: null,
  })

  const pollerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const terminalCountRef = useRef(0)

  const stopPolling = useCallback(() => {
    if (pollerRef.current) {
      clearTimeout(pollerRef.current)
      pollerRef.current = null
    }
  }, [])

  const pollOnce = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/ingest/status/${jobId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) return

      const data = await res.json()

      // Apply monotonic completion propagation before storing
      const correctedStages = propagateCompletion(data.stages ?? {})

      setState(prev => ({
        ...prev,
        jobId,
        status: data.status,
        stages: correctedStages,
        documents: data.documents ?? prev.documents,
        error: data.error ?? null,
        elapsedMs: data.elapsed_ms ?? prev.elapsedMs,
        currentPhase: data.current_phase ?? prev.currentPhase,
      }))

      // Stop polling once terminal
      const isTerminal = data.status === 'COMPLETE' || data.status === 'FAILED'
      if (isTerminal) {
        terminalCountRef.current++
        if (terminalCountRef.current >= MAX_TERMINAL_POLL_COUNT) {
          stopPolling()
          return
        }
      }

      // Schedule next poll
      pollerRef.current = setTimeout(() => pollOnce(jobId), POLL_INTERVAL_MS)
    } catch {
      // Network error — backoff and retry
      pollerRef.current = setTimeout(() => pollOnce(jobId), POLL_INTERVAL_MS * 2)
    }
  }, [projectId, stopPolling])

  const startJob = useCallback(async (files: File[]) => {
    stopPolling()
    terminalCountRef.current = 0

    // Upload files
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))

    const res = await fetch(`/api/projects/${projectId}/ingest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: formData,
    })
    const { job_id } = await res.json()

    setState(prev => ({ ...prev, jobId: job_id, status: 'RUNNING', error: null }))
    pollOnce(job_id)

    return job_id
  }, [projectId, pollOnce, stopPolling])

  // Clean up on unmount
  useEffect(() => () => stopPolling(), [stopPolling])

  return { state, startJob, stopPolling }
}
```

### 4.2 Both panels consume the same hook state

```tsx
// UploadPage.tsx
export default function UploadPage() {
  const { projectId } = useParams()
  const { state, startJob } = usePipelineJob(projectId!)

  return (
    <PageLayout>
      <DropZone onFiles={files => startJob(files)} />
      <StatRow
        queued={state.documents.filter(d => d.status === 'QUEUED').length}
        ready={state.documents.filter(d => d.status === 'COMPLETED').length}
        rejected={state.documents.filter(d => d.status === 'REJECTED').length}
        quotaKb={128.8}   {/* from project config */}
      />

      {/* ONE pipeline panel — not two */}
      {state.status !== 'IDLE' && (
        <PipelineStatusPanel state={state} />
      )}
    </PageLayout>
  )
}
```

---

## PART 5 — STAGE CARD DISPLAY CONSISTENCY

### 5.1 Stage timings

The LangGraph top panel shows **no timings**. The Pipeline Health bottom
panel shows timings. After merge, every stage card should show timing
when available:

```tsx
function StageCard({ stage }: { stage: StageDetail }) {
  const icon = {
    waiting:     <CircleIcon className="grey" />,
    in_progress: <SpinnerIcon className="orange" />,
    complete:    <CheckCircleIcon className="green" />,
    error:       <WarningIcon className="red" />,
    warning:     <WarningIcon className="yellow" />,
  }[stage.status]

  return (
    <div className={`stage-card stage-${stage.status}`}>
      {icon}
      <div className="stage-name">{stage.label}</div>
      <div className="stage-sub">{stage.subtitle}</div>
      <div className="stage-metric">
        {/* Show count if available */}
        {stage.count != null && <span>{stage.count}</span>}
        {/* Show elapsed if available */}
        {stage.elapsed_ms != null && (
          <span className="stage-time">{(stage.elapsed_ms / 1000).toFixed(1)} s</span>
        )}
      </div>
    </div>
  )
}
```

### 5.2 Stage label mapping (backend key → display label)

```typescript
const STAGE_LABELS: Record<string, { label: string; subtitle: (s: StageDetail) => string }> = {
  document_received: {
    label: 'Document received',
    subtitle: s => `${s.count} document(s) · ${s.bytes} bytes`,
  },
  stored_in_rustfs: {
    label: 'Stored in RustFS',
    subtitle: s => `rustfs · ${s.object_count}/${s.count} object(s) · ${s.bytes} bytes`,
  },
  parser: {
    label: 'Parser',
    subtitle: s => s.count != null ? `${s.count} pages` : 'Parsing…',
  },
  chunking: {
    label: 'Chunking',
    subtitle: s => s.count != null ? `${s.count} chunks` : 'Chunking…',
  },
  embedding: {
    label: 'Embedding',
    subtitle: s => s.count != null ? `${s.count}/${s.total} embeddings` : 'Embedding…',
  },
  vector_storage: {
    label: 'Vector storage',
    subtitle: s => s.count != null ? `${s.count} vectors` : 'Storing…',
  },
  retrieval: {
    label: 'Retrieval',
    subtitle: s => s.count != null ? `${s.count} chunks retrieved` : 'Retrieving…',
  },
  evidence_agent: {
    label: 'Evidence Agent',
    subtitle: s => s.count != null ? `${s.count} evidence items` : 'Waiting',
  },
  signal_agent: {
    label: 'Signal Agent',
    subtitle: s => s.count != null ? `${s.count} signals` : 'Waiting',
  },
}
```

---

## PART 6 — BACKEND STATUS ENDPOINT CONTRACT

The frontend polling depends on this endpoint being correct.
Verify it exists and returns this shape:

```typescript
// GET /api/projects/:projectId/ingest/status/:jobId
// Response shape:

interface IngestStatusResponse {
  job_id: string
  project_id: string
  status: 'RUNNING' | 'COMPLETE' | 'FAILED'
  current_phase: string       // e.g. "parser", "semantic_search"
  elapsed_ms: number
  error: string | null        // full error message if FAILED
  error_code: string | null   // e.g. "POLL_BUDGET_EXCEEDED"
  stages: {
    document_received?:  StageStatus
    stored_in_rustfs?:   StageStatus
    parser?:             StageStatus
    chunking?:           StageStatus
    embedding?:          StageStatus
    vector_storage?:     StageStatus
    retrieval?:          StageStatus
    evidence_agent?:     StageStatus
    signal_agent?:       StageStatus
  }
  documents: {
    id: string
    filename: string
    type: string
    pages: number
    chunks: number
    embedded: number
    storage: string
    status: 'QUEUED' | 'COMPLETED' | 'REJECTED'
  }[]
}

interface StageStatus {
  status: 'waiting' | 'in_progress' | 'complete' | 'error' | 'warning'
  count?: number
  total?: number
  bytes?: number
  object_count?: number
  elapsed_ms?: number
  error?: string
}
```

**If the backend does not return `error_code`, add it.** The frontend uses
it to show the correct retry/resume UX.

---

## PART 7 — SEARCH ORDER BEFORE CHANGING ANYTHING

```bash
# 1. Find the upload page component
grep -r "Build Your Project Intelligence\|upload.*page\|UploadPage\|upload-page" \
  frontend/src --include="*.tsx" -l

# 2. Find LangGraph panel component
grep -r "LangGraph flow\|LangGraphFlow\|langgraph-flow\|LangGraphPanel" \
  frontend/src --include="*.tsx" -l

# 3. Find Pipeline Health component
grep -r "Pipeline Health\|PipelineHealth\|pipeline-health\|pipeline_health" \
  frontend/src --include="*.tsx" -l

# 4. Confirm both are rendered in the same parent
# (If they are in the same file, removing one is a one-line fix)

# 5. Find the poll budget error origin
grep -rn "poll budget\|poll_budget\|POLL_BUDGET\|pollBudget" \
  --include="*.py" --include="*.ts" --include="*.js" .

# 6. Find the poller(s)
grep -rn "setInterval\|setTimeout\|useInterval\|pollStatus\|poll_status" \
  frontend/src --include="*.tsx" -l

# 7. Find if there are two separate pollers
grep -rn "useEffect.*fetch.*status\|useEffect.*poll" \
  frontend/src --include="*.tsx" -n
```

---

## PART 8 — ACCEPTANCE TESTS

### Duplicate panel fix
- [ ] Upload page shows **exactly one** pipeline progress section
- [ ] The single section shows all 9 stages: received → rustfs → parser → chunking → embedding → vector → retrieval → evidence → signal
- [ ] No duplicate stage names appear on the page at any point

### Poll budget fix
- [ ] A 6-chunk document completes ingestion without "exceeded poll budget" error
- [ ] A larger document (e.g. 50-page PDF, ~50 chunks) also completes
- [ ] If poll budget IS exceeded (very large file), the error banner shows actionable message with "Retry" button
- [ ] Retry does not re-upload already-stored documents

### Parser spinner fix
- [ ] When Chunking is ✓ and Embedding is ✓, Parser also shows ✓ (not spinning)
- [ ] Stage status never regresses from ✓ to spinning during a poll cycle
- [ ] `N of M pipeline stages complete` counter never decreases

### Polling architecture
- [ ] Browser network tab shows **one** `/status/:jobId` call every ~3 seconds (not two)
- [ ] Navigating away from upload page stops polling
- [ ] Navigating back to upload page resumes showing last known status (does not restart job)

---

## PART 9 — DO NOT BREAK

- [ ] Document upload still sends files correctly
- [ ] Queued / Ready / Rejected / Quota stat row still updates
- [ ] Document table at the bottom still shows after completion
- [ ] `RAG reachable · DB: connected · rustfs: connected` badges still visible
- [ ] Error state still shows the error message text (just with better UX)
- [ ] All other pages (Evidence Intelligence, Signal Explorer, etc.) unaffected

---

*End of FAILUREOPS X Upload Page Fix*
