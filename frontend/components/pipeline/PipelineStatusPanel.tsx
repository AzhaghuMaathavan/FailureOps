'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Loader2,
  Circle,
  AlertTriangle,
  GitBranch,
  ArrowRight,
  RotateCw,
  Search,
} from 'lucide-react';
import { LangGraphRunView } from './LangGraphRunPanel';

export type StageState = 'waiting' | 'in_progress' | 'complete' | 'error' | 'warning' | 'blocked';

export interface PipelineStageItem {
  id: string;
  key: string;
  label: string;
  subtitle: string;
  status: StageState;
  count?: number;
  total?: number;
  bytes?: number;
  objectCount?: number;
  elapsedMs?: number | null;
  error?: string | null;
}

export const PIPELINE_STAGES_ORDERED = [
  'document_received',
  'stored_in_rustfs',
  'parser',
  'chunking',
  'embedding',
  'vector_storage',
  'retrieval',
  'evidence_agent',
  'signal_agent',
] as const;

export type PipelineStageKey = typeof PIPELINE_STAGES_ORDERED[number];

const STAGE_ORDER_RANK: Record<StageState, number> = {
  waiting: 0,
  blocked: 0,
  in_progress: 1,
  warning: 2,
  error: 2,
  complete: 3,
};

/**
 * Propagates completion monotonically: if stage N is complete, all stages 0..N-1
 * are marked complete (unless they encountered an explicit error).
 */
export function propagateCompletion(stages: PipelineStageItem[]): PipelineStageItem[] {
  let highestCompleteIdx = -1;

  for (let i = 0; i < stages.length; i++) {
    if (stages[i].status === 'complete') {
      highestCompleteIdx = i;
    }
  }

  return stages.map((stage, idx) => {
    if (idx < highestCompleteIdx && stage.status !== 'error' && stage.status !== 'warning') {
      return {
        ...stage,
        status: 'complete' as StageState,
      };
    }
    return stage;
  });
}

function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function StageIcon({ status }: { status: StageState }) {
  if (status === 'complete') return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />;
  if (status === 'in_progress') return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />;
  if (status === 'error') return <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />;
}

interface PipelineStatusPanelProps {
  projectId: string;
  run?: LangGraphRunView | null;
  pipeline?: any | null;
  reachable?: boolean;
  database?: string;
  rustfsReachable?: boolean;
  rustfsProvider?: string;
  onRetry?: () => void;
  onCheckStatus?: () => void;
  isChecking?: boolean;
}

export const PipelineStatusPanel: React.FC<PipelineStatusPanelProps> = ({
  projectId,
  run,
  pipeline,
  reachable = true,
  database,
  rustfsReachable,
  rustfsProvider,
  onRetry,
  onCheckStatus,
  isChecking = false,
}) => {
  // Synthesize unified 9-stage model from run and pipeline
  const rawStages: PipelineStageItem[] = useMemo(() => {
    const pipeStages = pipeline?.stages || [];
    const runPhases = run?.phases || [];
    const pipeTotals = pipeline?.totals || {};

    const findPipe = (k: string) => pipeStages.find((s: any) => s.key === k);
    const findPhase = (k: string) => runPhases.find((p: any) => p.key === k);

    const mapStatus = (raw: string | undefined): StageState => {
      if (!raw) return 'waiting';
      const u = raw.toUpperCase();
      if (u === 'COMPLETED' || u === 'DONE') return 'complete';
      if (u === 'RUNNING' || u === 'IN_PROGRESS' || u === 'PROCESSING') return 'in_progress';
      if (u === 'FAILED') return 'error';
      if (u === 'WARNING') return 'warning';
      if (u === 'BLOCKED') return 'blocked';
      return 'waiting';
    };

    // 1. Document Received
    const docCount = pipeTotals.documents || run?.documents?.length || 0;
    const docRecPipe = findPipe('document_received') || findPipe('received');
    const docPhase = findPhase('upload');
    const docStatus = docCount > 0 || docPhase?.status === 'COMPLETED' ? 'complete' : mapStatus(docPhase?.status || docRecPipe?.status);

    // 2. Stored in RustFS
    const rustPipe = findPipe('stored_in_rustfs') || findPipe('rustfs');
    const rustStatus = docCount > 0 ? (rustfsReachable ? 'complete' : mapStatus(rustPipe?.status)) : 'waiting';

    // 3. Parser
    const parserPipe = findPipe('parser');
    const parserPhase = findPhase('parser');
    const pageCount = pipeTotals.pages || run?.documents?.reduce((s, d) => s + (d.pageCount || 0), 0) || 0;
    const parserStatus = mapStatus(parserPipe?.status || parserPhase?.status);

    // 4. Chunking
    const chunkPipe = findPipe('chunking');
    const chunkPhase = findPhase('chunker');
    const chunkCount = pipeTotals.chunks || run?.documents?.reduce((s, d) => s + (d.chunkCount || 0), 0) || 0;
    const chunkStatus = mapStatus(chunkPipe?.status || chunkPhase?.status);

    // 5. Embedding
    const embPipe = findPipe('embedding');
    const embPhase = findPhase('embedding');
    const embCount = pipeTotals.embedded || run?.documents?.reduce((s, d) => s + (d.embeddedCount || 0), 0) || 0;
    const embStatus = mapStatus(embPipe?.status || embPhase?.status);

    // 6. Vector Storage
    const vecPipe = findPipe('vector') || findPipe('vector_storage');
    const vecPhase = findPhase('vector');
    const vecCount = pipeTotals.vectors || embCount;
    const vecStatus = mapStatus(vecPipe?.status || vecPhase?.status);

    // 7. Retrieval / Semantic Search
    const retPipe = findPipe('retrieval');
    const retPhase = findPhase('semantic_search');
    const retCount = pipeTotals.retrieved || pipeTotals.chunksSearched || 0;
    const retStatus = mapStatus(retPipe?.status || retPhase?.status);

    // 8. Evidence Agent
    const evPipe = findPipe('evidence') || findPipe('evidence_agent');
    const evPhase = findPhase('evidence_agent');
    const evCount = pipeTotals.evidence || run?.evidenceCount || 0;
    const evStatus = mapStatus(evPipe?.status || evPhase?.status);

    // 9. Signal Agent
    const sigPipe = findPipe('signals') || findPipe('signal_agent');
    const sigPhase = findPhase('signal_agent');
    const sigCount = pipeTotals.signals || run?.signalCount || 0;
    const sigStatus = mapStatus(sigPipe?.status || sigPhase?.status);

    return [
      {
        id: 'document_received',
        key: 'document_received',
        label: 'Document received',
        subtitle: docCount > 0 ? `${docCount} document(s) accepted` : 'Waiting for upload',
        status: docStatus,
        count: docCount,
        elapsedMs: docPhase?.latencyMs,
      },
      {
        id: 'stored_in_rustfs',
        key: 'stored_in_rustfs',
        label: 'Stored in RustFS',
        subtitle: `${rustfsProvider || 'rustfs'} · encrypted at rest`,
        status: rustStatus,
        count: docCount,
      },
      {
        id: 'parser',
        key: 'parser',
        label: 'Parser',
        subtitle: pageCount > 0 ? `${pageCount} page(s) structured` : parserPipe?.detail || 'Extracting layout & tables',
        status: parserStatus,
        count: pageCount,
        elapsedMs: parserPhase?.latencyMs,
      },
      {
        id: 'chunking',
        key: 'chunking',
        label: 'Chunking',
        subtitle: chunkCount > 0 ? `${chunkCount} semantic chunks` : chunkPipe?.detail || 'Splitting context boundaries',
        status: chunkStatus,
        count: chunkCount,
        elapsedMs: chunkPhase?.latencyMs,
      },
      {
        id: 'embedding',
        key: 'embedding',
        label: 'Embedding',
        subtitle: embCount > 0 ? `${embCount} vectors generated` : embPipe?.detail || 'Generating vector representations',
        status: embStatus,
        count: embCount,
        elapsedMs: embPhase?.latencyMs,
      },
      {
        id: 'vector_storage',
        key: 'vector_storage',
        label: 'Vector storage',
        subtitle: vecCount > 0 ? `${vecCount} vectors indexed` : vecPipe?.detail || 'HNSW index committed to pgvector',
        status: vecStatus,
        count: vecCount,
        elapsedMs: vecPhase?.latencyMs,
      },
      {
        id: 'retrieval',
        key: 'retrieval',
        label: 'Retrieval',
        subtitle: retCount > 0 ? `${retCount} chunks matched` : retPipe?.detail || 'Executing multi-vector recall',
        status: retStatus,
        count: retCount,
        elapsedMs: retPhase?.latencyMs,
      },
      {
        id: 'evidence_agent',
        key: 'evidence_agent',
        label: 'Evidence Agent',
        subtitle: evCount > 0 ? `${evCount} evidence items extracted` : evPhase?.detail || 'Member 1 verifying source citations',
        status: evStatus,
        count: evCount,
        elapsedMs: evPhase?.latencyMs,
      },
      {
        id: 'signal_agent',
        key: 'signal_agent',
        label: 'Signal Agent',
        subtitle: sigCount > 0 ? `${sigCount} operational signals active` : sigPhase?.detail || 'Member 2 modeling metric velocity',
        status: sigStatus,
        count: sigCount,
        elapsedMs: sigPhase?.latencyMs,
      },
    ];
  }, [pipeline, run, rustfsReachable, rustfsProvider]);

  // Apply monotonic propagation so parser doesn't stay spinning when chunking/embedding are done
  const stages = useMemo(() => propagateCompletion(rawStages), [rawStages]);

  const completedCount = stages.filter((s) => s.status === 'complete').length;
  const isFailed = run?.status === 'FAILED' || stages.some((s) => s.status === 'error');
  const isRunning = run?.status === 'RUNNING' || stages.some((s) => s.status === 'in_progress');
  const isDone = completedCount === stages.length;

  const activePhase = run?.phases?.find((p) => p.key === run?.currentPhase);

  // Combined documents from run or pipeline
  const documents = (run?.documents && run.documents.length > 0)
    ? run.documents
    : (pipeline?.documents || []);

  const isPollBudgetError = run?.error?.toLowerCase().includes('poll budget') ||
    run?.error?.toLowerCase().includes('budget');

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">LangGraph Pipeline</h2>
            <p className="text-xs text-muted-foreground">
              Upload → RAG → Evidence agent → Signal agent
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRunning && activePhase && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] font-bold text-primary animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Current phase: {activePhase.label}</span>
            </span>
          )}

          {isDone && (
            <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] font-bold text-success">
              <CheckCircle2 className="h-3 w-3" />
              <span>Complete{run?.totalLatencyMs ? ` · ${formatMs(run.totalLatencyMs)}` : ''}</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${
              reachable
                ? 'border-success/30 bg-surface-feed text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {reachable ? 'RAG reachable' : 'RAG unavailable'}
          </span>

          {database && (
            <span className="rounded-full border border-border bg-surface-feed px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
              DB: {database}
            </span>
          )}

          {typeof rustfsReachable === 'boolean' && (
            <span
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                rustfsReachable
                  ? 'border-success/30 bg-surface-feed text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {rustfsProvider || 'rustfs'}: {rustfsReachable ? 'connected' : 'unreachable'}
            </span>
          )}
        </div>
      </div>

      {/* Actionable Error Banner */}
      {isFailed && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {isPollBudgetError ? 'Ingestion Taking Longer Than Expected' : 'Pipeline Execution Failed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onCheckStatus && (
                <button
                  type="button"
                  onClick={onCheckStatus}
                  disabled={isChecking}
                  className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface-feed px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground hover:bg-card transition-colors disabled:opacity-50"
                >
                  <Search className="h-3 w-3" />
                  <span>{isChecking ? 'Checking...' : 'Check status'}</span>
                </button>
              )}
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex cursor-pointer items-center gap-1 rounded bg-destructive px-2.5 py-1 font-mono text-[11px] font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <RotateCw className="h-3 w-3" />
                  <span>Retry ingestion</span>
                </button>
              )}
            </div>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            {isPollBudgetError
              ? `The pipeline is still processing your uploaded documents in the backend. Your files were received and stored safely. You can check the current live status or retry reasoning without re-uploading.`
              : run?.error || 'An error occurred during pipeline execution.'}
          </p>
        </div>
      )}

      {/* Stage Progress Count */}
      <p className="font-mono text-[11px] text-muted-foreground" role="status" aria-atomic="true">
        {completedCount} of {stages.length} pipeline stages complete
      </p>

      {/* Unified 9-Stage Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`rounded-xl border p-3 transition-colors ${
              stage.status === 'complete'
                ? 'border-success/30 bg-surface-feed/70'
                : stage.status === 'in_progress'
                  ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30'
                  : stage.status === 'error'
                    ? 'border-destructive/30 bg-destructive/10'
                    : stage.status === 'warning'
                      ? 'border-warning/30 bg-warning/10'
                      : 'border-border/40 bg-card/40 opacity-85'
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StageIcon status={stage.status} />
                <span className="text-xs font-semibold tracking-tight text-foreground">{stage.label}</span>
              </div>
              {stage.elapsedMs != null && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatMs(stage.elapsedMs)}
                </span>
              )}
            </div>
            <p className="pl-6 text-[11px] text-muted-foreground leading-relaxed">{stage.subtitle}</p>
            {typeof stage.count === 'number' && stage.count > 0 && (
              <p className="mt-1 pl-6 font-mono text-[10px] font-bold text-foreground">
                {stage.count} {stage.id === 'parser' ? 'pages' : stage.id === 'chunking' ? 'chunks' : stage.id === 'embedding' ? 'embeddings' : stage.id === 'retrieval' ? 'retrieved' : 'items'}
              </p>
            )}
            {stage.error && (
              <p role="alert" className="mt-1 pl-6 text-[11px] text-destructive">
                {stage.error}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Ingested Documents Table */}
      {documents.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Processed Pipeline Documents ({documents.length})
          </h4>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-[11px]">
              <thead className="bg-surface-feed font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Pages</th>
                  <th className="px-3 py-2">Chunks</th>
                  <th className="px-3 py-2">Embedded</th>
                  <th className="px-3 py-2">Storage</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc: any) => (
                  <tr key={doc.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{doc.title || doc.filename}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{doc.documentType || doc.document_type || '—'}</td>
                    <td className="px-3 py-2 font-mono">{doc.pageCount ?? doc.page_count ?? 0}</td>
                    <td className="px-3 py-2 font-mono">{doc.chunkCount ?? doc.chunk_count ?? 0}</td>
                    <td className="px-3 py-2 font-mono">{doc.embeddedCount ?? doc.embedded_count ?? 0}</td>
                    <td className="px-3 py-2 font-mono">{doc.storageProvider || doc.storage_provider || 'rustfs'}</td>
                    <td className="px-3 py-2 font-mono">
                      <span className={`inline-flex items-center gap-1 font-bold ${
                        (doc.status === 'COMPLETED' || doc.status === 'READY') ? 'text-success' : 'text-warning'
                      }`}>
                        {(doc.status === 'COMPLETED' || doc.status === 'READY') && <CheckCircle2 className="h-3 w-3" />}
                        {doc.status || 'READY'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex justify-end pt-1">
        <Link
          href={`/projects/${projectId}/pipeline`}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <span>Open detailed RAG pipeline</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};
