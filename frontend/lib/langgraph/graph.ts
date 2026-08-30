import 'server-only';

import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { UserSession } from '@/lib/server/auth';
import { RagBackendError, ragFetch } from '@/lib/server/rag';
import { redactForDisplay } from './privacy';
import { clearRunFiles, getRun, getRunFiles, patchRun } from './store';
import {
  DocumentChunkSnapshot,
  emptyPhases,
  LangGraphPhase,
  PhaseRecord,
  PHASE_LABELS,
} from './types';

const MAX_INGEST_POLLS = 120;
const MAX_ANALYSIS_POLLS = 120;
const POLL_MS = 2500;
const MAX_AGENT_ATTEMPTS = 2;
const GRAPH_RECURSION_LIMIT = 12;

const GraphState = Annotation.Root({
  runId: Annotation<string>(),
  projectId: Annotation<string>(),
  organizationName: Annotation<string>(),
  analysisId: Annotation<string | null>(),
  documentIds: Annotation<string[]>(),
  error: Annotation<string | null>(),
});

type GraphStateType = typeof GraphState.State;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redact(text: string, orgName: string): string {
  return redactForDisplay(text, [orgName, 'Aurora Technologies']);
}

function markPhase(
  runId: string,
  key: LangGraphPhase,
  patch: Partial<PhaseRecord> & { status: PhaseRecord['status'] },
  extras: { currentPhase?: LangGraphPhase; documents?: DocumentChunkSnapshot[]; analysisId?: string | null } = {}
): void {
  const run = getRun(runId);
  if (!run) return;
  const now = new Date().toISOString();
  const phases = run.phases.map((phase) => {
    if (phase.key !== key) return phase;
    const startedAt = patch.startedAt ?? phase.startedAt ?? (patch.status === 'RUNNING' ? now : phase.startedAt);
    const endedAt =
      patch.endedAt ??
      (patch.status === 'COMPLETED' || patch.status === 'FAILED' ? now : phase.endedAt);
    const latencyMs =
      patch.latencyMs ??
      (startedAt && endedAt ? Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)) : phase.latencyMs);
    return { ...phase, ...patch, startedAt, endedAt, latencyMs };
  });
  const started = Date.parse(run.startedAt);
  patchRun(runId, {
    status: patch.status === 'FAILED' ? 'FAILED' : 'RUNNING',
    currentPhase: extras.currentPhase ?? key,
    phases,
    documents: extras.documents ?? run.documents,
    analysisId: extras.analysisId === undefined ? run.analysisId : extras.analysisId,
    totalLatencyMs: Number.isFinite(started) ? Date.now() - started : run.totalLatencyMs,
  });
}

function snapshotDocuments(docs: any[]): DocumentChunkSnapshot[] {
  return (docs || []).map((doc) => ({
    id: String(doc.id || ''),
    filename: String(doc.filename || 'document'),
    title: doc.title || undefined,
    documentType: doc.document_type || undefined,
    status: String(doc.status || 'UNKNOWN'),
    pageCount: Number(doc.page_count || 0),
    chunkCount: Number(doc.chunk_count || 0),
    embeddedCount: Number(doc.embedded_count || 0),
    storageProvider: doc.storage_provider || doc.storage?.provider,
  }));
}

async function fetchPipeline(session: UserSession, projectId: string) {
  return ragFetch<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/pipeline`, session, {
    timeoutMs: 30_000,
  });
}

function stageOf(pipeline: any, key: string) {
  return (pipeline?.stages || []).find((stage: any) => stage.key === key);
}

function ingestReady(docs: DocumentChunkSnapshot[], uploadedIds: string[], pipeline?: any): boolean {
  const relevant = uploadedIds.length
    ? docs.filter((doc) => uploadedIds.includes(doc.id))
    : docs;
  if (relevant.length === 0) return false;

  const allTerminal = relevant.every(
    (doc) =>
      doc.status === 'COMPLETED' ||
      doc.status === 'READY' ||
      doc.status === 'FAILED' ||
      doc.embeddedCount > 0
  );
  if (allTerminal) return true;

  const embStage = (pipeline?.stages || []).find((s: any) => s.key === 'embedding' || s.key === 'vector');
  const retStage = (pipeline?.stages || []).find((s: any) => s.key === 'retrieval');
  if (
    (embStage && embStage.status === 'COMPLETED' && (embStage.count ?? 0) > 0) ||
    (retStage && (retStage.status === 'COMPLETED' || (retStage.count ?? 0) > 0))
  ) {
    return true;
  }

  return false;
}

async function nodeUpload(state: GraphStateType, session: UserSession): Promise<Partial<GraphStateType>> {
  const files = getRunFiles(state.runId);
  markPhase(state.runId, 'upload', { status: 'RUNNING', detail: 'Sending documents into RAG' });
  const documentIds: string[] = [];

  for (const file of files) {
    const forwarded = new File([Buffer.from(file.bytes)], file.filename, {
      type: file.mimeType || 'application/octet-stream',
    });
    const form = new FormData();
    form.append('file', forwarded, file.filename);
    form.append('project_id', state.projectId);
    form.append('title', file.title || file.filename);
    form.append('document_type', file.documentType || 'PROJECT_DOC');
    form.append('source_type', file.documentType || 'PROJECT_DOC');
    form.append('description', file.description || '');
    form.append('visibility', file.visibility || 'PRIVATE');
    form.append('sync', 'true');
    if (file.department) form.append('department', file.department);

    const uploaded = await ragFetch<any>(
      `/api/documents/upload`,
      session,
      { method: 'POST', body: form, timeoutMs: 180_000 }
    );
    if (uploaded?.document_id) documentIds.push(uploaded.document_id);
    if (uploaded?.status === 'FAILED') {
      throw new Error(uploaded.error_message || `RAG ingest failed for ${file.filename}`);
    }
  }

  markPhase(state.runId, 'upload', {
    status: 'COMPLETED',
    detail: `${documentIds.length} document(s) accepted by RAG`,
    count: documentIds.length,
  });
  return { documentIds };
}

async function nodeWatchRag(state: GraphStateType, session: UserSession): Promise<Partial<GraphStateType>> {
  const ragPhases: Array<{ ours: LangGraphPhase; theirs: string }> = [
    { ours: 'parser', theirs: 'parser' },
    { ours: 'chunker', theirs: 'chunking' },
    { ours: 'embedding', theirs: 'embedding' },
    { ours: 'vector', theirs: 'vector' },
    { ours: 'semantic_search', theirs: 'retrieval' },
  ];

  for (const { ours } of ragPhases) {
    markPhase(state.runId, ours, { status: 'RUNNING', detail: `Waiting on RAG ${PHASE_LABELS[ours].toLowerCase()}` });
  }

  for (let attempt = 0; attempt < MAX_INGEST_POLLS; attempt += 1) {
    const pipeline = await fetchPipeline(session, state.projectId);
    const documents = snapshotDocuments(pipeline.documents || []);
    patchRun(state.runId, { documents });

    for (const { ours, theirs } of ragPhases) {
      const stage = stageOf(pipeline, theirs);
      const status = String(stage?.status || 'PENDING');
      const mapped =
        status === 'COMPLETED' || status === 'FAILED' || status === 'RUNNING' || status === 'BLOCKED'
          ? (status === 'BLOCKED' ? 'RUNNING' : status)
          : 'RUNNING';
      markPhase(
        state.runId,
        ours,
        {
          status: mapped as PhaseRecord['status'],
          detail: redact(String(stage?.detail || PHASE_LABELS[ours]), state.organizationName),
          count: typeof stage?.count === 'number' ? stage.count : documents.reduce((sum, doc) => {
            if (ours === 'chunker') return sum + doc.chunkCount;
            if (ours === 'embedding' || ours === 'vector') return sum + doc.embeddedCount;
            return sum;
          }, 0),
        },
        { documents, currentPhase: ours }
      );
    }

    if (ingestReady(documents, state.documentIds, pipeline)) {
      for (const { ours, theirs } of ragPhases) {
        const stage = stageOf(pipeline, theirs);
        markPhase(state.runId, ours, {
          status: 'COMPLETED',
          detail: redact(String(stage?.detail || 'Ready for retrieval'), state.organizationName),
          count: stage?.count,
        });
      }
      return {};
    }

    await sleep(POLL_MS);
  }

  throw new Error('RAG ingest exceeded the poll budget (parser / chunker / embedding).');
}

async function pollAnalysisUntil(
  runId: string,
  session: UserSession,
  projectId: string,
  analysisId: string,
  orgName: string,
  phase: LangGraphPhase,
  ready: (status: any) => boolean
) {
  for (let attempt = 0; attempt < MAX_ANALYSIS_POLLS; attempt += 1) {
    const status = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/analysis/${encodeURIComponent(analysisId)}`,
      session,
      { timeoutMs: 30_000 }
    );
    if (status.status === 'FAILED') {
      throw new Error(redact(status.error_message || 'Analysis failed', orgName));
    }
    markPhase(runId, phase, {
      status: 'RUNNING',
      detail: redact(`${status.current_stage || phase} · ${status.progress_percent || 0}%`, orgName),
    });
    if (ready(status)) return status;
    await sleep(POLL_MS);
  }
  throw new Error(`Agent loop exceeded poll budget at ${phase}`);
}

async function nodeEvidence(state: GraphStateType, session: UserSession): Promise<Partial<GraphStateType>> {
  markPhase(state.runId, 'evidence_agent', { status: 'RUNNING', detail: 'Agent 1 extracting evidence from RAG chunks' });
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_AGENT_ATTEMPTS; attempt += 1) {
    try {
      const started = await ragFetch<any>(
        `/api/v1/projects/${encodeURIComponent(state.projectId)}/analysis`,
        session,
        {
          method: 'POST',
          body: JSON.stringify({ project_id: state.projectId }),
          timeoutMs: 30_000,
        }
      );
      const analysisId = started.analysis_id as string;
      patchRun(state.runId, { analysisId });
      await pollAnalysisUntil(
        state.runId,
        session,
        state.projectId,
        analysisId,
        state.organizationName,
        'evidence_agent',
        (status) => status.status === 'COMPLETED'
      );

      let packet: any = null;
      try {
        packet = await ragFetch<any>(
          `/api/v1/projects/${encodeURIComponent(state.projectId)}/analysis/${encodeURIComponent(analysisId)}/evidence`,
          session
        );
      } catch (error) {
        if (!(error instanceof RagBackendError && error.status === 400)) throw error;
      }
      const evidenceCount = Array.isArray(packet?.evidence) ? packet.evidence.length : 0;
      markPhase(
        state.runId,
        'evidence_agent',
        {
          status: 'COMPLETED',
          detail: `Agent 1 extracted ${evidenceCount} evidence item(s)`,
          count: evidenceCount,
        },
        { analysisId }
      );
      patchRun(state.runId, { evidenceCount });
      return { analysisId };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Evidence agent failed';
    }
  }

  throw new Error(lastError || 'Evidence agent failed after retry budget');
}

async function nodeSignal(state: GraphStateType, session: UserSession): Promise<Partial<GraphStateType>> {
  if (!state.analysisId) throw new Error('Signal agent cannot run without an analysis id from Agent 1');
  markPhase(state.runId, 'signal_agent', { status: 'RUNNING', detail: 'Agent 2 analyzing evidence interlinks' });

  await pollAnalysisUntil(
    state.runId,
    session,
    state.projectId,
    state.analysisId,
    state.organizationName,
    'signal_agent',
    (status) => status.status === 'COMPLETED'
  );

  const packet = await ragFetch<any>(
    `/api/v1/projects/${encodeURIComponent(state.projectId)}/analysis/${encodeURIComponent(state.analysisId)}/signals`,
    session
  );
  const signalCount = Array.isArray(packet?.signals) ? packet.signals.length : 0;
  markPhase(state.runId, 'signal_agent', {
    status: 'COMPLETED',
    detail: `Agent 2 stored ${signalCount} signal(s) in the database`,
    count: signalCount,
  });
  patchRun(state.runId, { signalCount, analysisId: state.analysisId });
  return {};
}

function compileGraph(session: UserSession) {
  return new StateGraph(GraphState)
    .addNode('upload', (state) => nodeUpload(state, session))
    .addNode('watch_rag', (state) => nodeWatchRag(state, session))
    .addNode('evidence_agent', (state) => nodeEvidence(state, session))
    .addNode('signal_agent', (state) => nodeSignal(state, session))
    .addEdge(START, 'upload')
    .addEdge('upload', 'watch_rag')
    .addEdge('watch_rag', 'evidence_agent')
    .addEdge('evidence_agent', 'signal_agent')
    .addEdge('signal_agent', END)
    .compile();
}

export async function executeLangGraphRun(runId: string, session: UserSession): Promise<void> {
  const run = getRun(runId);
  if (!run) throw new Error('LangGraph run not found');
  patchRun(runId, { status: 'RUNNING', phases: run.phases.length ? run.phases : emptyPhases() });

  try {
    const graph = compileGraph(session);
    await graph.invoke(
      {
        runId,
        projectId: run.projectId,
        organizationName: session.organizationName || '',
        analysisId: null,
        documentIds: [],
        error: null,
      },
      { recursionLimit: GRAPH_RECURSION_LIMIT }
    );
    const finished = getRun(runId);
    const started = Date.parse(run.startedAt);
    patchRun(runId, {
      status: 'COMPLETED',
      currentPhase: 'signal_agent',
      completedAt: new Date().toISOString(),
      totalLatencyMs: Number.isFinite(started) ? Date.now() - started : finished?.totalLatencyMs,
      error: null,
    });
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : 'LangGraph run failed', session.organizationName);
    const current = getRun(runId);
    const phase = (current?.currentPhase || 'upload') as LangGraphPhase;
    markPhase(runId, phase, { status: 'FAILED', detail: message });
    patchRun(runId, {
      status: 'FAILED',
      error: message,
      completedAt: new Date().toISOString(),
    });
  } finally {
    clearRunFiles(runId);
  }
}
