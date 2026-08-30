'use client';

import React from 'react';
import { Layers, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DimensionRiskScore } from '@/types';

interface RiskDimensionsBannerProps {
  dimensions: DimensionRiskScore[];
}

function getSeverityBadge(severity: string) {
  const sev = (severity || 'MEDIUM').toUpperCase();
  switch (sev) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-destructive/15 text-destructive border border-destructive/30">
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-warning/15 text-warning border border-warning/30">
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
          MEDIUM
        </span>
      );
    case 'LOW':
    case 'HEALTHY':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-success/15 text-success border border-success/30">
          LOW
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-surface-feed text-muted-foreground border border-border">
          {sev}
        </span>
      );
  }
}

function getDirectionIcon(trend?: string | null) {
  const t = (trend || '').toUpperCase();
  if (t === 'INCREASING' || t === 'WORSENING' || t === 'ESCALATING') {
    return <TrendingUp className="w-3.5 h-3.5 text-destructive inline" aria-hidden="true" />;
  }
  if (t === 'DECREASING' || t === 'IMPROVING') {
    return <TrendingDown className="w-3.5 h-3.5 text-success inline" aria-hidden="true" />;
  }
  return <Minus className="w-3.5 h-3.5 text-muted-foreground inline" aria-hidden="true" />;
}

export const RiskDimensionsBanner: React.FC<RiskDimensionsBannerProps> = ({ dimensions }) => {
  if (!dimensions || dimensions.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>Deterministic Risk Dimensions (Failure DNA)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Normalized 0–100 dimension risk scoring derived strictly from verified document evidence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {dimensions.map((dim, idx) => {
          const score = dim.risk_score !== null && dim.risk_score !== undefined ? Math.round(dim.risk_score * 10) / 10 : null;
          const hasChange = dim.change_percent !== null && dim.change_percent !== undefined;
          const conf = Math.round(dim.confidence <= 1 ? dim.confidence * 100 : dim.confidence);

          return (
            <div
              key={dim.dimension || idx}
              className="bg-surface-feed border border-border/80 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground truncate">
                  {dim.dimension}
                </span>
                {getSeverityBadge(dim.severity)}
              </div>

              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl font-extrabold font-mono text-foreground leading-none">
                  {score !== null ? score : '—'}
                  <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                </span>
                {hasChange && (
                  <span className="text-xs font-mono font-bold flex items-center gap-0.5 text-destructive">
                    {getDirectionIcon(dim.trend)}
                    {dim.change_percent! > 0 ? `+${dim.change_percent}%` : `${dim.change_percent}%`}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-2 border-t border-border/50">
                <span>{dim.evidence_count} Evidence Items</span>
                <span className="font-semibold text-primary">{conf}% Conf</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
