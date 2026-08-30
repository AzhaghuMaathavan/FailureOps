'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import { RAG_ANALYSIS_STAGES } from '@/services/analysisService';
import { AnalysisStage } from '@/types';
import { useApp } from '@/context/AppContext';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { KpiStat } from '@/components/evidence/KpiStat';

export default function AnalysisProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project, setAnalysisCompleted } = useApp();

  const [stages, setStages] = useState<AnalysisStage[]>(RAG_ANALYSIS_STAGES);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let lastLogKey = '';

    async function runAnalysis() {
      try {
        setLogs([
          `[${new Date().toISOString().slice(11, 19)}] Starting RAG analysis for project ${projectId}...`,
        ]);

        const startRes = await apiClient.startAnalysis(projectId, 'DEEP');
        const anlId = startRes.analysisId || startRes.jobId;

        setLogs((prev) => [
          ...prev,
          `[${new Date().toISOString().slice(11, 19)}] Analysis job registered: ${anlId}`,
        ]);

        pollInterval = setInterval(async () => {
          if (isCancelled) return;
          try {
            const statusData = await apiClient.getAnalysisStatus(anlId, projectId);
            if (statusData.stages?.length) {
              setStages(statusData.stages);
              const runningIdx = statusData.stages.findIndex((s) => s.status === 'RUNNING' || s.status === 'FAILED');
              if (runningIdx !== -1) setCurrentStageIdx(runningIdx);
            }
            if (typeof statusData.progressPercent === 'number') {
              setProgressPercent(statusData.progressPercent);
            }

            const logKey = `${statusData.status}:${statusData.currentStage}:${statusData.progressPercent}`;
            if (logKey !== lastLogKey) {
              lastLogKey = logKey;
              setLogs((prev) => [
                ...prev,
                `[${new Date().toISOString().slice(11, 19)}] ${statusData.status} (${statusData.progressPercent || 0}%) ${statusData.currentStage || ''}`.trim(),
              ]);
            }

            if (statusData.status === 'COMPLETED') {
              if (pollInterval) clearInterval(pollInterval);
              setStages((prev) => prev.map((s) => ({ ...s, status: 'COMPLETED' })));
              setIsFinished(true);
              setAnalysisCompleted(true);
              const metrics = statusData.resultSummary;
              setLogs((prev) => [
                ...prev,
                `[${new Date().toISOString().slice(11, 19)}] Analysis COMPLETED`,
                metrics
                  ? `  → chunks searched: ${metrics.total_chunks_searched ?? 'n/a'} · evidence: ${metrics.total_evidence_extracted ?? 'n/a'} · verified: ${metrics.verified_evidence_count ?? 'n/a'}`
                  : '  → backend metrics not attached',
              ]);
            } else if (statusData.status === 'FAILED') {
              if (pollInterval) clearInterval(pollInterval);
              setAnalysisError(statusData.errorMessage || 'Analysis pipeline failed.');
            }
          } catch (pollErr: unknown) {
            if (pollInterval) clearInterval(pollInterval);
            setAnalysisError(
              isRagUnavailable(pollErr)
                ? 'RAG unavailable'
                : pollErr instanceof Error
                  ? pollErr.message
                  : 'Unable to poll analysis status.'
            );
          }
        }, 2000);
      } catch (err: unknown) {
        setAnalysisError(
          isRagUnavailable(err)
            ? 'RAG unavailable'
            : err instanceof Error
              ? err.message
              : 'Failed to start project analysis'
        );
      }
    }

    runAnalysis();

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [projectId, setAnalysisCompleted]);

  const runningCount = stages.filter((s) => s.status === 'COMPLETED').length;
  const failedCount = stages.filter((s) => s.status === 'FAILED').length;
  const currentStage = stages[currentStageIdx];
  const stageLabel = isFinished
    ? 'Complete'
    : analysisError
      ? 'Blocked'
      : currentStage?.name || 'Starting';
  const etaLabel = isFinished
    ? 'Done'
    : analysisError
      ? '—'
      : progressPercent > 0
        ? `${Math.max(0, 100 - progressPercent)}% left`
        : 'Enclave';

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
                setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 19)}] Triggering simulated intelligence fixture...`]);
                const simRes = await apiClient.simulateIntelligence(projectId);
                setLogs((prev) => [
                  ...prev,
                  `[${new Date().toISOString().slice(11, 19)}] Simulated analysis complete: ${simRes.analysisId}`,
                  `  → Fixture: ${simRes.fixtureVersion} · Evidence: ${simRes.metrics?.total_evidence_extracted ?? 5} · Signals: ${simRes.metrics?.total_signals ?? 5}`
                ]);
                setIsFinished(true);
                setAnalysisCompleted(true);
                setStages((prev) => prev.map((s) => ({ ...s, status: 'COMPLETED' })));
                setProgressPercent(100);
              } catch (err: any) {
                setAnalysisError(err.message || 'Simulated execution failed');
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
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}/overview`)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to Overview
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground opacity-80 shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)]"
            >
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Pipeline running
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
            <p className="font-bold">Analysis did not complete</p>
            <p className="mt-1 font-mono text-xs">{analysisError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat
          label="Stage"
          value={stageLabel}
          hint={`${runningCount} of ${stages.length}`}
          valueClassName="text-primary"
        />
        <KpiStat label="ETA" value={etaLabel} hint="Enclave" valueClassName="text-info" />
        <KpiStat
          label="Blockers"
          value={failedCount}
          hint={failedCount === 0 ? 'Ready' : 'Failed stages'}
          valueClassName={failedCount === 0 ? 'text-success' : 'text-destructive'}
        />
        <KpiStat
          label="Last run"
          value={isFinished ? 'Just now' : analysisError ? 'Failed' : `${progressPercent}%`}
          hint={isFinished ? 'Complete' : 'Live poll'}
          valueClassName="text-muted-foreground"
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
          <p className="text-sm font-semibold text-foreground">When done</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Radar, prediction, and intervention ranking update together.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)] lg:col-span-6">
          <div className="flex items-center justify-between border-b border-border pb-3 font-mono text-xs">
            <span className="font-bold uppercase text-muted-foreground">Backend stages</span>
            <span className="font-bold text-primary" role="status" aria-atomic="true">
              {isFinished ? `${stages.length}/${stages.length} COMPLETE` : `${runningCount}/${stages.length} · ${progressPercent}%`}
            </span>
          </div>

          <div className="space-y-2">
            {stages.map((stg) => {
              const isCompleted = stg.status === 'COMPLETED';
              const isRunning = stg.status === 'RUNNING';
              const isFailed = stg.status === 'FAILED';

              return (
                <div
                  key={stg.id}
                  className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                    isFailed
                      ? 'border-destructive/50 bg-destructive/10 text-foreground'
                      : isRunning
                        ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40'
                        : isCompleted
                          ? 'border-success/20 bg-surface-feed/70 text-foreground/90'
                          : 'border-border/40 bg-card/30 text-muted-foreground/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                    ) : isFailed ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-border" aria-hidden="true" />
                    )}
                    <div>
                      <span className="block text-xs font-bold tracking-tight">{stg.name}</span>
                      <span className="block max-w-[240px] truncate text-[10px] text-muted-foreground">
                        {stg.description}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                      isCompleted
                        ? 'bg-surface-feed text-success'
                        : isRunning
                          ? 'bg-primary text-primary-foreground'
                          : isFailed
                            ? 'bg-destructive/20 text-destructive'
                            : 'text-muted-foreground/50'
                    }`}
                  >
                    {stg.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex h-[520px] flex-col justify-between rounded-xl border border-border bg-surface-feed p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)] lg:col-span-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-3 font-mono text-xs">
              <div className="flex items-center gap-2 font-bold text-primary">
                <Terminal className="h-4 w-4" aria-hidden="true" />
                <span>Backend status stream</span>
              </div>
            </div>
            <div className="mt-4 max-h-[400px] space-y-1.5 overflow-y-auto pr-2 font-mono text-xs text-muted-foreground">
              {logs.map((log, i) => (
                <p key={i} className="leading-relaxed text-foreground/80">
                  {log}
                </p>
              ))}
              {!isFinished && !analysisError && (
                <p className="font-bold text-primary motion-safe:animate-pulse">_ waiting for RAG worker...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
