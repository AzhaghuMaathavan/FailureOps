'use client';

import React from 'react';
import { FailureDNADimension } from '@/types';
import { ShieldAlert, AlertTriangle, History } from 'lucide-react';
import { RiskBadge } from '@/components/common/RiskBadge';

interface DimensionExplainerProps {
  dimension: FailureDNADimension;
}

export const DimensionExplainer: React.FC<DimensionExplainerProps> = ({ dimension }) => {
  return (
    <div
      id="dimension-explainer"
      className="p-[18px] rounded-[14px] bg-card border border-border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-muted border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                {dimension.dimension} Risk Decomposition
              </h3>
              <RiskBadge level={dimension.severity} />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Score: <span className="text-foreground font-bold">{dimension.score}/100</span> • Evidence Confidence: {dimension.evidenceConfidence}%
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-feed border border-border text-xs font-mono text-muted-foreground shrink-0">
          <History className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span>Historical Correlation Verified</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
            Root Dynamic (Why this score exists)
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed p-4 rounded-xl bg-surface-feed border border-border font-medium">
            {dimension.whyExplanation}
          </p>
        </div>

        {dimension.primaryDrivers && dimension.primaryDrivers.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Observed Evidence Drivers
            </h4>
            <div className="space-y-2">
              {dimension.primaryDrivers.map((driver, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border text-xs text-foreground font-medium"
                >
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="leading-relaxed">{driver}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dimension.historicalCorrelation && (
          <div className="p-3.5 rounded-xl bg-magic/10 border border-magic/30 flex items-start gap-2.5 text-xs text-magic">
            <History className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold">Historical Vector Match: </span>
              <span className="text-foreground/80">{dimension.historicalCorrelation}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
