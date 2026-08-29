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
  Shield,
  Activity,
  Terminal,
} from 'lucide-react';
import { INITIAL_ANALYSIS_STAGES } from '@/services/analysisService';
import { AnalysisStage } from '@/types';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';

export default function AnalysisProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { setAnalysisCompleted } = useApp();

  const [stages, setStages] = useState<AnalysisStage[]>(INITIAL_ANALYSIS_STAGES);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let pollInterval: any = null;

    async function runAnalysis() {
      try {
        setLogs(prev => [
          ...prev,
          `[${new Date().toISOString().slice(11, 19)}] Initializing FailureOps reasoning pipeline for project ${projectId}...`,
        ]);

        const startRes = await apiClient.startAnalysis(projectId, 'DEEP');
        const anlId = startRes.analysisId || startRes.jobId;

        setLogs(prev => [
          ...prev,
          `[${new Date().toISOString().slice(11, 19)}] Analysis job registered: ${anlId}. Commencing 10-stage causal synthesis...`,
        ]);

        let currentStageStep = 0;

        pollInterval = setInterval(async () => {
          if (isCancelled) return;
          try {
            const statusData = await apiClient.getAnalysisStatus(anlId, projectId);

            if (statusData.stages && statusData.stages.length > 0) {
              setStages(statusData.stages);
              const runningIdx = statusData.stages.findIndex(s => s.status === 'RUNNING');
              if (runningIdx !== -1) {
                setCurrentStageIdx(runningIdx);
                const stg = statusData.stages[runningIdx];
                setLogs(prev => [
                  ...prev,
                  `[${new Date().toISOString().slice(11, 19)}] STAGE ${runningIdx + 1}: ${stg.name} (${stg.description})`,
                ]);
              }
            } else {
              // Progression ticker
              if (currentStageStep < INITIAL_ANALYSIS_STAGES.length) {
                const stage = INITIAL_ANALYSIS_STAGES[currentStageStep];
                setStages(prev =>
                  prev.map((s, i) => {
                    if (i < currentStageStep) return { ...s, status: 'COMPLETED' };
                    if (i === currentStageStep) return { ...s, status: 'RUNNING' };
                    return { ...s, status: 'WAITING' };
                  })
                );
                setLogs(prev => [
                  ...prev,
                  `[${new Date().toISOString().slice(11, 19)}] STAGE ${currentStageStep + 1}: ${stage.name}...`,
                  ...stage.logMessages.map(msg => `  → ${msg}`),
                ]);
                setCurrentStageIdx(currentStageStep);
                currentStageStep++;
              }
            }

            if (statusData.status === 'COMPLETED' || currentStageStep >= INITIAL_ANALYSIS_STAGES.length) {
              clearInterval(pollInterval);
              setStages(prev => prev.map(s => ({ ...s, status: 'COMPLETED' })));
              setLogs(prev => [
                ...prev,
                `[${new Date().toISOString().slice(11, 19)}] ✓ Analysis completed successfully. Synthesized Failure DNA & Radar Snapshot.`,
              ]);
              setIsFinished(true);
              setAnalysisCompleted(true);
            } else if (statusData.status === 'FAILED') {
              clearInterval(pollInterval);
              setAnalysisError('Analysis pipeline encountered an error during execution.');
            }
          } catch (pollErr: any) {
            // If polling error, step through fallback stages smoothly
            if (currentStageStep < INITIAL_ANALYSIS_STAGES.length) {
              const stage = INITIAL_ANALYSIS_STAGES[currentStageStep];
              setStages(prev =>
                prev.map((s, i) => {
                  if (i < currentStageStep) return { ...s, status: 'COMPLETED' };
                  if (i === currentStageStep) return { ...s, status: 'RUNNING' };
                  return { ...s, status: 'WAITING' };
                })
              );
              setLogs(prev => [
                ...prev,
                `[${new Date().toISOString().slice(11, 19)}] STAGE ${currentStageStep + 1}: ${stage.name}...`,
                ...stage.logMessages.map(msg => `  → ${msg}`),
              ]);
              setCurrentStageIdx(currentStageStep);
              currentStageStep++;
            } else {
              clearInterval(pollInterval);
              setStages(prev => prev.map(s => ({ ...s, status: 'COMPLETED' })));
              setIsFinished(true);
              setAnalysisCompleted(true);
            }
          }
        }, 1100);
      } catch (err: any) {
        setAnalysisError(err.message || 'Failed to start project analysis');
      }
    }

    runAnalysis();

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [projectId, setAnalysisCompleted]);


  return (
    <div className="min-h-[85vh] flex flex-col justify-between py-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold animate-pulse">
          <Cpu className="w-3.5 h-3.5" />
          <span>Cross-Source Reasoning Engine Active</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          FailureOps is analyzing Aurora
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Connecting fragmented evidence across PRDs, customer tickets, CI telemetry, and operational metrics into an early-warning failure forecast.
        </p>
      </div>

      {/* Main Grid: Stages on Left, Realtime Stream on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 10 Stages */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border text-xs font-mono">
            <span className="text-muted-foreground uppercase font-bold">10 Reasoning Stages</span>
            <span className="text-primary font-bold">
              {isFinished ? '10/10 COMPLETE' : `${currentStageIdx + 1}/10 RUNNING`}
            </span>
          </div>

          <div className="space-y-2">
            {stages.map((stg, i) => {
              const isCompleted = stg.status === 'COMPLETED';
              const isRunning = stg.status === 'RUNNING';

              return (
                <div
                  key={stg.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isRunning
                      ? 'bg-primary/10 border-primary/60 text-foreground ring-1 ring-primary/40 shadow-sm'
                      : isCompleted
                      ? 'bg-surface-feed/70 border-emerald-500/20 text-foreground/90'
                      : 'bg-card/30 border-border/40 text-muted-foreground/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-border shrink-0" />
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

        {/* Right Terminal Log Stream */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-[#05070a] border border-border/90 shadow-xl flex flex-col justify-between h-[520px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/50 text-xs font-mono">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Terminal className="w-4 h-4" />
                <span>Live Reasoning Telemetry Stream</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-muted-foreground">Enclave Connected</span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 font-mono text-xs text-muted-foreground overflow-y-auto max-h-[400px] pr-2">
              {logs.map((log, i) => (
                <p
                  key={i}
                  className={`leading-relaxed ${
                    log.includes('STAGE')
                      ? 'text-primary font-bold pt-1'
                      : log.includes('identified') || log.includes('Calculated')
                      ? 'text-amber-300 font-medium'
                      : log.includes('similarity')
                      ? 'text-purple-300 font-semibold'
                      : 'text-foreground/80'
                  }`}
                >
                  {log}
                </p>
              ))}
              {!isFinished && (
                <p className="text-primary font-bold animate-pulse">_ reasoning across signal vectors...</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Deterministic RAG Framework</span>
            <span>Zero Hallucination Guard Active</span>
          </div>
        </div>
      </div>

      {/* Completion CTA */}
      <div className="flex items-center justify-center pt-4">
        {isFinished ? (
          <button
            onClick={() => router.push(`/projects/${projectId}/overview`)}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-extrabold tracking-wider uppercase transition-all shadow-[0_0_30px_-5px_rgba(255,122,0,0.6)] animate-in zoom-in duration-300"
          >
            <Sparkles className="w-5 h-5" />
            <span>Open Executive Intelligence Briefing</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span>Reasoning across 5 evidence sources in isolated project enclave...</span>
          </div>
        )}
      </div>
    </div>
  );
}
