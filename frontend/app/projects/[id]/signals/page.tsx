'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, RefreshCw, Activity, Layers, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Signal, DimensionRiskScore } from '@/types';
import { RiskDimensionsBanner } from '@/components/signals/RiskDimensionsBanner';
import { SignalCard } from '@/components/signals/SignalCard';

const cardShadow = 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]';

export default function SignalExplorerPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [signals, setSignals] = useState<Signal[]>([]);
  const [riskDimensions, setRiskDimensions] = useState<DimensionRiskScore[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sev1Only, setSev1Only] = useState(false);

  const fetchSignals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getSignals(projectId);
      setSignals(data.signals || []);
      setRiskDimensions(data.riskDimensions || []);
      setAnalysisId(data.analysisId);
    } catch (err: any) {
      setError(err?.message || 'Failed to load signals.');
      setSignals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [projectId]);

  const criticalCount = signals.filter(s => s.severity === 'CRITICAL').length;
  const highCount = signals.filter(s => s.severity === 'HIGH').length;
  const escalatingCount = signals.filter(
    s => s.trend === 'INCREASING' && s.direction !== 'POSITIVE'
  ).length;
  const corroboratedCount = signals.filter(s => (s.supportingEvidenceIds?.length || 0) >= 2).length;
  const novelCount = signals.filter(s => (s.historicalPrevalence ?? 0) === 0 || s.signalType === 'NOVEL').length;
  const visible = sev1Only ? signals.filter(s => s.severity === 'CRITICAL') : signals;

  return (
    <div className="space-y-6">
      {/* Top Header matching LangGraph Orchestrated banner */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Activity className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              FailureOps Intelligence Service
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              LangGraph Orchestrated
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Real RAG Retrieval &rarr; Evidence Agent &rarr; Signal Agent &rarr; Grounded Structured Intelligence
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchSignals}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-[10px] border border-border bg-surface-feed hover:bg-card text-xs font-bold font-mono text-foreground transition-all duration-200 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            <span>Refresh Data</span>
          </button>

          <button
            type="button"
            aria-pressed={sev1Only}
            onClick={() => setSev1Only(v => !v)}
            className={`inline-flex items-center justify-center min-h-[40px] px-3.5 py-2 rounded-[10px] border text-xs font-bold font-mono transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              sev1Only
                ? 'bg-primary-muted border-primary text-primary'
                : 'bg-surface-feed border-border text-foreground hover:bg-card'
            }`}
          >
            Filter SEV-1
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Active Signals</p>
          <p className="font-mono text-[26px] font-bold leading-none text-warning">{isLoading ? '—' : signals.length}</p>
          <p className="text-[11px] font-mono text-muted-foreground">{escalatingCount || highCount + criticalCount} escalating</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">SEV-1 Critical</p>
          <p className="font-mono text-[26px] font-bold leading-none text-destructive">{isLoading ? '—' : criticalCount}</p>
          <p className="text-[11px] font-mono text-muted-foreground">Action required</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Corroborated</p>
          <p className="font-mono text-[26px] font-bold leading-none text-success">{isLoading ? '—' : corroboratedCount}</p>
          <p className="text-[11px] font-mono text-muted-foreground">&ge;2 Evidence sources</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Novel Seeds</p>
          <p className="font-mono text-[26px] font-bold leading-none text-primary">{isLoading ? '—' : novelCount}</p>
          <p className="text-[11px] font-mono text-muted-foreground">Emerging vector</p>
        </div>
      </div>

      {/* 1. Deterministic Risk Dimensions Banner (Failure DNA) */}
      {riskDimensions.length > 0 && (
        <RiskDimensionsBanner dimensions={riskDimensions} />
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-[280px] rounded-xl bg-card border border-border animate-pulse ${cardShadow}`} />
          ))}
        </div>
      )}

      {/* Error Alert */}
      {!isLoading && error && (
        <div role="alert" className="p-6 rounded-xl bg-destructive/10 border border-destructive/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <p className="text-sm font-mono text-destructive">{error}</p>
          <button
            type="button"
            onClick={fetchSignals}
            className="px-4 py-2 min-h-[40px] rounded-[10px] bg-destructive/20 hover:bg-destructive/30 text-xs font-mono text-destructive border border-destructive/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Retry Loading Signals
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && signals.length === 0 && (
        <div className={`p-12 rounded-xl bg-card border border-border text-center space-y-4 ${cardShadow}`}>
          <ShieldCheck className="w-12 h-12 text-success mx-auto opacity-80" aria-hidden="true" />
          <h3 className="text-lg font-bold text-foreground">
            {analysisId
              ? 'No sufficiently supported operational signals detected.'
              : 'No completed analysis yet'}
          </h3>
          <p className="text-xs font-mono text-muted-foreground max-w-md mx-auto">
            {analysisId
              ? 'The Signal Agent ran against retrieved evidence and did not detect metric anomalies or trend shifts.'
              : 'Signals are synthesized from grounded document evidence after running project intelligence.'}
          </p>
          <Link
            href={`/projects/${projectId}/analysis`}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Run Project Analysis
          </Link>
        </div>
      )}

      {/* Signal Cards Grid (2-column layout matching screenshot) */}
      {!isLoading && !error && visible.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Synthesized Operational Signals ({visible.length})
            </h2>
            {sev1Only && (
              <span className="text-xs font-mono text-primary font-semibold">
                Filtering by SEV-1 Critical
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visible.map(sig => (
              <SignalCard key={sig.id} signal={sig} projectId={projectId} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !error && signals.length > 0 && visible.length === 0 && (
        <p className="text-xs font-mono text-muted-foreground text-center py-6">
          No SEV-1 signals in the current set. Clear the filter to see all {signals.length} signals.
        </p>
      )}
    </div>
  );
}

