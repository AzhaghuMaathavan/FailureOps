'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  Terminal,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';
import { KpiStat } from '@/components/evidence/KpiStat';
import { useAnalysisStatus } from '@/hooks/useAnalysisStatus';

export default function AnalysisProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project, setAnalysisCompleted } = useApp();

  const {
    analysisId,
    status,
    currentStage: activeStageName,
    progressPercent,
    stages,
    isFinished,
    isPolling,
    error: analysisError,
    metrics,
    logs,
    startAnalysis,
  } = useAnalysisStatus({
    projectId,
    autoStart: true,
    baseIntervalMs: 2000,
    maxIntervalMs: 8000,
  });

  React.useEffect(() => {
    if (isFinished) {
      setAnalysisCompleted(true);
    }
  }, [isFinished, setAnalysisCompleted]);

  const completedCount = stages.filter((s) => s.status === 'COMPLETED').length;
  const failedCount = stages.filter((s) => s.status === 'FAILED').length;
  const currentStageIdx = stages.findIndex((s) => s.status === 'RUNNING' || s.status === 'FAILED');
  const currentStage = currentStageIdx !== -1 ? stages[currentStageIdx] : (isFinished ? stages[stages.length - 1] : stages[0]);

  const stageLabel = isFinished
    ? 'All Stages Done'
    : analysisError
      ? `Failed at ${currentStage?.name || 'Pipeline'}`
      : status === 'RETRYING'
        ? 'Retrying Node'
        : currentStage?.name || 'Initializing';

  const executionStatus = isFinished
    ? 'Completed'
    : analysisError
      ? 'Interrupted'
      : status === 'RUNNING'
        ? 'Processing'
        : 'Queued';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            CONTINUOUS REASONING
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[28px]">
            Run Analysis
          </h1>
          <p className="max-w-xl text-[13px] text-muted-foreground">
            Execute the full pipeline: evidence → DNA → truth → radar → prediction. Analyzing {project.name || projectId}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const simRes = await apiClient.simulateIntelligence(projectId);
                setAnalysisCompleted(true);
                router.push(`/projects/${projectId}/overview`);
              } catch (err: any) {
                console.error('Simulation failed', err);
              }
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Run simulated upstream LangGraph fixture through real downstream FailureOps backend"
          >
            <span>Simulate Intelligence</span>
          </button>

          {isFinished ? (
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}/overview`)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Open briefing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : analysisError ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startAnalysis()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Retry Analysis
              </button>
              <button
                type="button"
                onClick={() => router.push(`/projects/${projectId}/overview`)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Back to Overview
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground opacity-80 shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)]"
            >
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Pipeline running ({progressPercent}%)
            </button>
          )}
        </div>
      </div>

      {analysisError && (
        <div
          role="alert"
          tabIndex={-1}
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Analysis paused or encountered an issue</p>
            <p className="mt-1 font-mono text-xs">{analysisError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat
          label="Active Node"
          value={stageLabel}
          hint={`${completedCount} of ${stages.length} completed`}
          valueClassName={isFinished ? 'text-success' : analysisError ? 'text-destructive' : 'text-primary'}
        />
        <KpiStat
          label="Execution State"
          value={executionStatus}
          hint={isFinished ? '100% complete' : `${progressPercent}% progress`}
          valueClassName={isFinished ? 'text-success' : analysisError ? 'text-destructive' : 'text-info'}
        />
        <KpiStat
          label="Blockers"
          value={failedCount}
          hint={failedCount === 0 ? 'Zero failures' : 'Stage failure detected'}
          valueClassName={failedCount === 0 ? 'text-success' : 'text-destructive'}
        />
        <KpiStat
          label={isFinished ? 'Verified Output' : 'Live Progress'}
          value={isFinished ? 'Ready' : analysisError ? 'Failed' : `${progressPercent}%`}
          hint={isFinished ? 'Packets persisted' : isPolling ? 'Live execution stream' : 'Idle'}
          valueClassName="text-foreground"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <p className="text-sm font-semibold text-foreground">Now computing</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {currentStage?.description || 'Evidence Agent and Signal Agent run after parser, chunker, embedder, and retriever finish.'}
          </p>
        </div>
        <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <p className="text-sm font-semibold text-foreground">Active analysis job</p>
          <p className="mt-2 font-mono text-xs text-primary">{analysisId || 'Starting background worker...'}</p>
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <h2 className="text-sm font-semibold text-foreground">Pipeline Stages (12-stage reasoning)</h2>
        <div className="mt-6 space-y-4">
          {stages.map((st, idx) => {
            const isCompleted = st.status === 'COMPLETED';
            const isCurrent = st.status === 'RUNNING';
            const isFailed = st.status === 'FAILED';

            return (
              <div key={st.id || idx} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  ) : isFailed ? (
                    <AlertTriangle className="h-5 w-5 text-rose-400" aria-hidden="true" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : isCurrent ? 'text-primary font-bold' : isFailed ? 'text-rose-400' : 'text-muted-foreground'}`}>
                      {st.name}
                    </p>
                    <span className="text-xs font-mono text-muted-foreground">
                      {isCompleted ? 'Done' : isCurrent ? 'Active' : isFailed ? 'Failed' : 'Pending'}
                    </span>

                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {st.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 pb-3 border-b border-border text-sm font-semibold text-foreground">
          <Terminal className="h-4 w-4 text-primary" aria-hidden="true" />
          Live Execution Stream
        </div>
        <div className="mt-4 font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto text-muted-foreground">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
