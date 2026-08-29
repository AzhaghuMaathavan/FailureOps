'use client';

import React from 'react';
import { FailureDNADimension } from '@/types';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowUpRight, History } from 'lucide-react';
import { RiskBadge } from '@/components/common/RiskBadge';

interface DimensionExplainerProps {
  dimension: FailureDNADimension;
}

export const DimensionExplainer: React.FC<DimensionExplainerProps> = ({ dimension }) => {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                {dimension.dimension} Risk Decomposition
              </h3>
              <RiskBadge level={dimension.severity} />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Score: <span className="text-foreground font-bold">{dimension.score}/100</span> • Evidence Confidence: {dimension.evidenceConfidence}%
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-feed border border-border/80 text-xs font-mono text-muted-foreground">
          <History className="w-3.5 h-3.5 text-primary" />
          <span>Historical Correlation Verified</span>
        </div>
      </div>

      {/* WHY Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span>Root Dynamic (Why this score exists)</span>
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed p-4 rounded-xl bg-surface-feed/70 border border-border/70 font-medium">
            {dimension.whyExplanation}
          </p>
        </div>

        {/* Primary Evidence Drivers */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Observed Evidence Drivers
          </h4>
          <div className="space-y-2">
            {dimension.primaryDrivers.map((driver, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-card/60 border border-border/60 text-xs text-foreground font-medium"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{driver}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Pattern Match */}
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-2.5 text-xs text-purple-300">
          <History className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-purple-200">Historical Vector Match: </span>
            <span>{dimension.historicalCorrelation}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
