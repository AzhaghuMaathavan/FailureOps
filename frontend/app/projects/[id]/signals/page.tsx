'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Signal } from '@/types';
import { RiskBadge } from '@/components/common/RiskBadge';

const cardShadow = 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]';

export default function SignalExplorerPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [signals, setSignals] = useState<Signal[]>([]);
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            Weak Signal Explorer
          </p>
          <h1 className="text-[28px] font-extrabold text-foreground tracking-tight">
            Signal Explorer
          </h1>
          <p className="text-[13px] text-muted-foreground max-w-xl">
            Escalating precursors ranked by velocity, corroboration, and historical lethality.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchSignals}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-[10px] border border-border bg-card hover:bg-surface-feed text-xs font-bold text-foreground transition-all duration-200 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            aria-pressed={sev1Only}
            onClick={() => setSev1Only(v => !v)}
            className={`inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] border text-xs font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              sev1Only
                ? 'bg-primary-muted border-primary text-primary'
                : 'bg-surface-feed border-border text-foreground hover:bg-card'
            }`}
          >
            Filter SEV-1
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Active</p>
          <p className="font-mono text-[26px] font-bold leading-none text-warning">{isLoading ? '—' : signals.length}</p>
          <p className="text-[11px] text-muted-foreground">{escalatingCount || highCount + criticalCount} escalating</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">SEV-1</p>
          <p className="font-mono text-[26px] font-bold leading-none text-destructive">{isLoading ? '—' : criticalCount}</p>
          <p className="text-[11px] text-muted-foreground">Need owners</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Corroborated</p>
          <p className="font-mono text-[26px] font-bold leading-none text-success">{isLoading ? '—' : corroboratedCount}</p>
          <p className="text-[11px] text-muted-foreground">≥2 sources</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Novel</p>
          <p className="font-mono text-[26px] font-bold leading-none text-magic">{isLoading ? '—' : novelCount}</p>
          <p className="text-[11px] text-muted-foreground">No memory hit</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-[68px] rounded-[10px] bg-card border border-border animate-pulse ${cardShadow}`} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div role="alert" className="p-6 rounded-xl bg-destructive/10 border border-destructive/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <p className="text-sm font-mono text-destructive">{error}</p>
          <button
            type="button"
            onClick={fetchSignals}
            className="px-4 py-2 min-h-[44px] rounded-[10px] bg-destructive/20 hover:bg-destructive/30 text-xs font-mono text-destructive border border-destructive/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Retry Loading Signals
          </button>
        </div>
      )}

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
              ? 'The Signal Agent ran against retrieved evidence and did not extract supported operational signals.'
              : 'Signals are derived from RAG-retrieved evidence after you run project analysis. This is not the same as RAG being down.'}
          </p>
          <Link
            href={`/projects/${projectId}/analysis`}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Run Project Analysis
          </Link>
        </div>
      )}

      {!isLoading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-2">
          {visible.map(sig => {
            const isPositive = sig.direction === 'POSITIVE';
            return (
              <article
                key={sig.id}
                className={`flex flex-col gap-3 p-4 rounded-xl bg-card border border-border ${cardShadow} space-y-1`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                        {sig.category}
                      </span>
                      {sig.polarity && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface-feed border border-border text-muted-foreground uppercase">
                          {sig.polarity.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground mt-0.5">
                      {sig.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RiskBadge level={sig.severity} />
                    {typeof sig.riskScore === 'number' && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-destructive/10 border border-destructive/30 text-destructive">
                        Risk: {Math.round(sig.riskScore)}/100
                      </span>
                    )}
                  </div>
                </div>

                {/* Telemetry vs Risk Separation Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border/70 bg-surface-feed p-2.5 font-mono text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Raw Telemetry Movement</span>
                    <span className="font-bold text-foreground">
                      {sig.currentValue !== undefined && sig.currentValue !== null && sig.baselineValue !== undefined && sig.baselineValue !== null
                        ? `${sig.baselineValue}${sig.unit ? ' ' + sig.unit : ''} → ${sig.currentValue}${sig.unit ? ' ' + sig.unit : ''} (${sig.baselineToCurrentChangePercent !== undefined && sig.baselineToCurrentChangePercent !== null ? (sig.baselineToCurrentChangePercent >= 0 ? '+' : '') + sig.baselineToCurrentChangePercent + '%' : ''})`
                        : sig.metricChange || 'Empirical observation'}
                    </span>
                  </div>
                  <div className="space-y-0.5 sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Risk Movement</span>
                    <span className={`font-bold inline-flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="w-3 h-3" aria-hidden="true" />
                      )}
                      {sig.riskTrend || sig.trend || 'STABLE'}
                      {typeof sig.riskChangePercent === 'number' ? ` (${sig.riskChangePercent >= 0 ? '+' : ''}${sig.riskChangePercent}%)` : ''}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{sig.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-muted-foreground border-t border-border/40">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-muted-foreground/70">Evidence:</span>
                    {(sig.supportingEvidenceIds || []).length > 0 ? (
                      (sig.supportingEvidenceIds || []).map(eid => (
                        <Link
                          key={eid}
                          href={`/projects/${projectId}/evidence#${eid}`}
                          className="px-2 py-0.5 rounded bg-card border border-border hover:border-primary/50 text-primary font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          #{eid}
                        </Link>
                      ))
                    ) : (
                      <span className="text-muted-foreground/60">Cross-source correlation</span>
                    )}
                  </div>
                  <span>
                    Signal Strength {sig.signalStrength ?? 0}% · Grounding {sig.confidence}%
                  </span>
                </div>
              </article>
            );
          })}
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
