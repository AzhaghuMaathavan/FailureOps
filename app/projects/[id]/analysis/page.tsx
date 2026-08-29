'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Circle,
  Cpu,
  ArrowRight,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import { RAG_ANALYSIS_STAGES } from '@/services/analysisService';
import { AnalysisStage } from '@/types';
import { useApp } from '@/context/AppContext';
import { apiClient, isRagUnavailable } from '@/lib/api/client';

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

  return (
    <div className="min-h-[85vh] flex flex-col justify-between py-6 space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold">
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
          <span>RAG analysis pipeline</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Analyzing {project.name || projectId}
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Evidence Agent and Signal Agent run only after the canonical RAG parser, chunker, embedder, and retriever finish.
        </p>
      </div>

      {analysisError && (
        <div
          role="alert"
          tabIndex={-1}
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold">Analysis did not complete</p>
            <p className="text-xs font-mono mt-1">{analysisError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border text-xs font-mono">
            <span className="text-muted-foreground uppercase font-bold">Backend stages</span>
            <span className="text-primary font-bold" role="status" aria-atomic="true">
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
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isFailed
                      ? 'bg-rose-500/10 border-rose-500/50 text-foreground'
                      : isRunning
                        ? 'bg-primary/10 border-primary/60 text-foreground ring-1 ring-primary/40 shadow-sm'
                        : isCompleted
                          ? 'bg-surface-feed/70 border-emerald-500/20 text-foreground/90'
                          : 'bg-card/30 border-border/40 text-muted-foreground/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" aria-hidden="true" />
                    ) : isFailed ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle className="w-4 h-4 text-border shrink-0" aria-hidden="true" />
                    )}
                    <div>
                      <span className="text-xs font-bold tracking-tight block">{stg.name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[240px]">
                        {stg.description}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : isRunning
                          ? 'bg-primary text-white'
                          : isFailed
                            ? 'bg-rose-500/20 text-rose-300'
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

        <div className="lg:col-span-6 p-6 rounded-2xl bg-[#05070a] border border-border/90 shadow-xl flex flex-col justify-between h-[520px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/50 text-xs font-mono">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Terminal className="w-4 h-4" aria-hidden="true" />
                <span>Backend status stream</span>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 font-mono text-xs text-muted-foreground overflow-y-auto max-h-[400px] pr-2">
              {logs.map((log, i) => (
                <p key={i} className="leading-relaxed text-foreground/80">
                  {log}
                </p>
              ))}
              {!isFinished && !analysisError && (
                <p className="text-primary font-bold animate-pulse">_ waiting for RAG worker...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pt-4">
        {isFinished ? (
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/overview`)}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-extrabold tracking-wider uppercase transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>Open Executive Intelligence Briefing</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : analysisError ? (
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/pipeline`)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-xs font-bold cursor-pointer"
          >
            Inspect RAG Pipeline
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span>Polling real analysis status from the RAG backend...</span>
          </div>
        )}
      </div>
    </div>
  );
}
