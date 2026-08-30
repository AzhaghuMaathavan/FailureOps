'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { Signal } from '@/types';
import { RiskBadge } from '@/components/common/RiskBadge';

interface SignalCardProps {
  signal: Signal;
  projectId: string;
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

export const SignalCard: React.FC<SignalCardProps> = ({ signal, projectId }) => {
  const hasRiskScore = signal.riskScore !== null && signal.riskScore !== undefined;
  const rawExplanation = signal.explanation || signal.description;
  const scoringMethodLabel = signal.scoringMethod || (signal.polarity ? signal.polarity.replace(/_/g, ' ') : null);

  const evidenceList = signal.supportingEvidenceIds || [];
  const primaryEvidenceId = evidenceList[0];

  const baseVal = signal.baselineValue;
  const prevVal = signal.previousValue;
  const currVal = signal.currentValue;

  const hasTelemetry = baseVal !== null || prevVal !== null || currVal !== null || (signal.metricChangePercent !== null && signal.metricChangePercent !== undefined);

  const totalChange = signal.baselineToCurrentChangePercent !== null && signal.baselineToCurrentChangePercent !== undefined
    ? (signal.baselineToCurrentChangePercent > 0 ? `+${signal.baselineToCurrentChangePercent}%` : `${signal.baselineToCurrentChangePercent}%`)
    : signal.metricChangePercent !== null && signal.metricChangePercent !== undefined
    ? (signal.metricChangePercent > 0 ? `+${signal.metricChangePercent}%` : `${signal.metricChangePercent}%`)
    : (baseVal !== null && baseVal !== undefined && currVal !== null && currVal !== undefined && baseVal !== 0)
    ? `${((currVal - baseVal) / baseVal * 100) > 0 ? '+' : ''}${Math.round(((currVal - baseVal) / baseVal * 100) * 100) / 100}%`
    : 'N/A';

  const periodChange = signal.previousToCurrentChangePercent !== null && signal.previousToCurrentChangePercent !== undefined
    ? (signal.previousToCurrentChangePercent > 0 ? `+${signal.previousToCurrentChangePercent}%` : `${signal.previousToCurrentChangePercent}%`)
    : (prevVal !== null && prevVal !== undefined && currVal !== null && currVal !== undefined && prevVal !== 0)
    ? `${((currVal - prevVal) / prevVal * 100) > 0 ? '+' : ''}${Math.round(((currVal - prevVal) / prevVal * 100) * 100) / 100}%`
    : 'N/A';

  return (
    <article
      id={signal.id}
      className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] flex flex-col justify-between space-y-3 transition-colors hover:border-primary/40"
    >
      <div>
        {/* Header: Title, Badges, Risk Score */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-mono font-bold text-foreground text-sm tracking-tight truncate">
                {signal.name}
              </h3>
              <RiskBadge level={signal.severity} />
              {scoringMethodLabel && (
                <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md uppercase">
                  {scoringMethodLabel}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              {signal.category}
            </span>
          </div>

          <div className="text-right shrink-0">
            {hasRiskScore ? (
              <div>
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider font-semibold block">
                  Risk Score
                </span>
                <div className="text-lg font-black font-mono text-foreground leading-tight">
                  <span className={signal.riskScore! >= 60 ? 'text-destructive' : signal.riskScore! >= 30 ? 'text-warning' : 'text-success'}>
                    {Math.round(signal.riskScore! * 10) / 10}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                </div>
              </div>
            ) : currVal !== null && currVal !== undefined ? (
              <div>
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider font-semibold block">
                  Observed Value
                </span>
                <div className="text-base font-bold font-mono text-foreground leading-tight">
                  {currVal}{signal.unit ? ` ${signal.unit}` : ''}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Synthesis Explanation Box */}
        {rawExplanation && (
          <p className="text-xs text-muted-foreground leading-relaxed bg-surface-feed p-3 rounded-lg border border-border/80 mb-3">
            {rawExplanation}
          </p>
        )}

        {/* 1. Raw Telemetry Metric Section (Rendered for metric signals) */}
        {hasTelemetry ? (
          <div className="mb-3 bg-surface-feed p-3 rounded-lg border border-border/80 space-y-2">
            <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Raw Telemetry Metric</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                {getDirectionIcon(signal.metricTrend || signal.trend)}
                {signal.metricTrend || signal.trend || 'UNKNOWN'}
              </span>
            </div>

            {/* Chronological Observations Row: Baseline, Previous, Current */}
            <div className="grid grid-cols-3 gap-2 text-xs pb-2 border-b border-border/50">
              <div>
                <span className="text-muted-foreground block text-[9px] font-mono uppercase font-semibold">Baseline:</span>
                <span className="font-mono font-bold text-foreground truncate block">
                  {baseVal !== null && baseVal !== undefined ? `${baseVal}${signal.unit ? ` ${signal.unit}` : ''}` : 'N/A'}
                </span>
                {signal.baselineTimestamp && (
                  <span className="text-[9px] font-mono text-muted-foreground block truncate">{signal.baselineTimestamp}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] font-mono uppercase font-semibold">Previous:</span>
                <span className="font-mono font-bold text-foreground truncate block">
                  {prevVal !== null && prevVal !== undefined ? `${prevVal}${signal.unit ? ` ${signal.unit}` : ''}` : 'N/A'}
                </span>
                {signal.previousTimestamp && (
                  <span className="text-[9px] font-mono text-muted-foreground block truncate">{signal.previousTimestamp}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] font-mono uppercase font-semibold">Current:</span>
                <span className="font-mono font-bold text-foreground truncate block">
                  {currVal !== null && currVal !== undefined ? `${currVal}${signal.unit ? ` ${signal.unit}` : ''}` : 'N/A'}
                </span>
                {signal.currentTimestamp && (
                  <span className="text-[9px] font-mono text-muted-foreground block truncate">{signal.currentTimestamp}</span>
                )}
              </div>
            </div>

            {/* Percentage Changes */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
              <div>
                <span className="text-muted-foreground block text-[9px] font-mono uppercase font-medium">Total Change (Baseline):</span>
                <span className="font-mono font-bold text-foreground">
                  {totalChange}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] font-mono uppercase font-medium">Period Change (Previous):</span>
                <span className="font-mono font-bold text-foreground">
                  {periodChange}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* 2. Normalized Risk Score Movement Section */}
        {hasRiskScore && (
          <div className="mb-2 bg-card p-3 rounded-lg border border-border space-y-2">
            <div className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
              <span>Risk Score Movement (0-100)</span>
              <span className="font-semibold text-foreground">
                {signal.riskTrend || 'STABLE'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] font-mono">Previous Risk:</span>
                <span className="font-mono font-bold text-foreground">
                  {signal.previousRiskScore !== null && signal.previousRiskScore !== undefined ? Math.round(signal.previousRiskScore) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-mono">Current Risk:</span>
                <span className="font-mono font-bold text-foreground">
                  {signal.riskScore !== null && signal.riskScore !== undefined ? Math.round(signal.riskScore) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-mono">Risk Change:</span>
                <span className="font-mono font-bold text-foreground flex items-center gap-0.5">
                  {getDirectionIcon(signal.riskTrend || 'STABLE')}
                  {signal.riskChangePercent !== null && signal.riskChangePercent !== undefined
                    ? (signal.riskChangePercent > 0 ? `+${signal.riskChangePercent}%` : `${signal.riskChangePercent}%`)
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Confidence & Evidence Drilldown */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        <span className="font-mono text-muted-foreground">
          Confidence: <strong className="text-primary font-bold">{Math.round(signal.confidence)}%</strong>
        </span>
        {primaryEvidenceId ? (
          <Link
            href={`/projects/${projectId}/evidence#${primaryEvidenceId}`}
            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:text-primary-hover hover:underline cursor-pointer"
          >
            <span>{evidenceList.length} Supporting Evidence</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">Cross-source telemetry</span>
        )}
      </div>
    </article>
  );
};
