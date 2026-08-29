'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Activity, TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { getSignalsByProjectId } from '@/data/mockSignals';
import { RiskBadge } from '@/components/common/RiskBadge';

export default function SignalExplorerPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const signals = getSignalsByProjectId(projectId);

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
              5 Active Anomalies
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-1">
            Signal Explorer & Velocity Trends
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Structured operational signals distilled from multi-source evidence citations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Activity className="w-4 h-4 text-primary" />
          <span>Real-time Anomaly Threshold: Active</span>
        </div>
      </div>

      {/* Signal Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {signals.map(sig => {
          const isCritical = sig.severity === 'CRITICAL';
          const isHigh = sig.severity === 'HIGH';

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
                        isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-foreground'
                      }`}
                    >
                      {sig.metricChange}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                      Direction
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {sig.trend}
                    </span>
                  </div>
                </div>

                {/* Connected Evidence List */}
                <div className="mt-4 space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold block">
                    Supported by Citations ({sig.supportingEvidenceIds.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sig.supportingEvidenceIds.map(eid => (
                      <span
                        key={eid}
                        className="px-2 py-0.5 rounded bg-surface-feed border border-border text-[10px] font-mono text-foreground font-medium"
                      >
                        #{eid}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Confidence: {sig.confidence}%</span>
                <span>Prevalence: {sig.historicalPrevalence}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
