'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, Zap, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Signal } from '@/types';
import { RiskBadge } from '@/components/common/RiskBadge';

export default function SignalExplorerPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getSignals(projectId);
      setSignals(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load signals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [projectId]);

  const criticalCount = signals.filter(s => s.severity === 'CRITICAL').length;
  const highCount = signals.filter(s => s.severity === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Signal Intelligence
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
              {criticalCount + highCount} Active High-Impact Signals
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-1">
            Signal Explorer & Velocity Trends
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Empirical operational signals synthesized deterministically from multi-source evidence citations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSignals}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-surface-hover text-xs font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Activity className="w-4 h-4 text-primary" />
            <span>Grounded Signal Engine: Active</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border/80 animate-pulse space-y-4">
              <div className="h-4 bg-surface-feed rounded w-1/3"></div>
              <div className="h-6 bg-surface-feed rounded w-3/4"></div>
              <div className="h-12 bg-surface-feed rounded w-full"></div>
              <div className="h-16 bg-surface-feed rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm font-mono text-rose-300">{error}</p>
          <button
            onClick={fetchSignals}
            className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-mono text-rose-200 border border-rose-500/40 cursor-pointer"
          >
            Retry Loading Signals
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && signals.length === 0 && (
        <div className="p-12 rounded-2xl bg-card border border-border/80 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
          <h3 className="text-lg font-bold text-foreground">No Active Operational Signals</h3>
          <p className="text-xs font-mono text-muted-foreground max-w-md mx-auto">
            No signal anomalies detected for this project yet. Run a fresh Evidence Intelligence analysis on project documents to generate signals.
          </p>
          <Link
            href={`/projects/${projectId}/analysis`}
            className="inline-block px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
          >
            Run Project Analysis
          </Link>
        </div>
      )}

      {/* Signal Matrix Cards */}
      {!isLoading && !error && signals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {signals.map(sig => {
            const isCritical = sig.severity === 'CRITICAL';
            const isHigh = sig.severity === 'HIGH';
            const isPositive = sig.direction === 'POSITIVE';

            return (
              <div
                key={sig.id}
                className="p-6 rounded-2xl bg-card border border-border/80 hover:border-primary/40 shadow-sm transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      {sig.category}
                    </span>
                    <RiskBadge level={sig.severity} />
                  </div>

                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    {sig.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {sig.description}
                  </p>

                  {/* Metric Telemetry */}
                  <div className="mt-4 p-3 rounded-xl bg-surface-feed/70 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                        Shift Delta
                      </span>
                      <span
                        className={`text-lg font-mono font-extrabold ${
                          isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : isPositive ? 'text-emerald-400' : 'text-foreground'
                        }`}
                      >
                        {sig.metricChange}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                        Direction
                      </span>
                      <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        {sig.trend}
                      </span>
                    </div>
                  </div>

                  {/* Connected Evidence List */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold block">
                      Supported by Citations ({sig.supportingEvidenceIds?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(sig.supportingEvidenceIds || []).map(eid => (
                        <a
                          key={eid}
                          href={`/projects/${projectId}/evidence#${eid}`}
                          className="px-2 py-0.5 rounded bg-surface-feed border border-border hover:border-primary/50 text-[10px] font-mono text-primary font-medium transition-colors cursor-pointer"
                        >
                          #{eid}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span title="Signal Strength: Weight of empirical evidence supporting the signal">
                    Strength: <strong className="text-foreground">{sig.signalStrength || 85}%</strong>
                  </span>
                  <span title="Signal Confidence: Citation grounding validity & lack of conflict">
                    Confidence: <strong className="text-foreground">{sig.confidence}%</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

