'use client';

import React from 'react';
import { AssumptionInvestigation } from '@/types';
import { Scale, AlertOctagon, CheckCircle2, ArrowRight, ShieldCheck, FileCheck } from 'lucide-react';

interface AssumptionCardProps {
  investigation: AssumptionInvestigation;
}

export const AssumptionCard: React.FC<AssumptionCardProps> = ({ investigation }) => {
  return (
    <div className="space-y-6">
      {/* 1. Team Belief Claim */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Investigated Team Assumption
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-surface-feed border border-border text-muted-foreground">
            Claim #01
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground">
          &ldquo;{investigation.assumptionText}&rdquo;
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5">
          {investigation.teamBelief}
        </p>
      </div>

      {/* 2. Empirical Evidence Review Breakdown */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Empirical Evidence Review (Cross-Source Telemetry)
            </h4>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {investigation.confidence}% Confidence
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {investigation.evidenceMetrics.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                m.isContradiction
                  ? 'bg-rose-500/10 border-rose-500/40 text-foreground'
                  : 'bg-surface-feed/70 border-border/80 text-foreground'
              }`}
            >
              <span className="text-xs text-muted-foreground block truncate">{m.label}</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold font-mono">{m.value}</span>
                {m.isContradiction && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                    CONTRADICTION
                  </span>
                )}
              </div>
              <div className="w-full bg-border/40 h-1 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.isContradiction ? 'bg-rose-500' : 'bg-primary'}`}
                  style={{ width: `${m.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Assumption Challenged Verdict Banner */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 shadow-md">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-amber-500 text-black">
                ⚠ ASSUMPTION CHALLENGED
              </span>
              <span className="text-xs font-mono text-amber-400">
                Confidence: {investigation.confidence}%
              </span>
            </div>
            <p className="text-sm font-semibold text-white leading-relaxed">
              {investigation.findingSummary}
            </p>
            <div className="pt-2 border-t border-amber-500/20">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Supported Alternative Explanation:
              </span>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {investigation.alternativeExplanation}
              </p>
            </div>
          </div>
        </div>

        {/* Source citation footer */}
        <div className="mt-4 pt-3 border-t border-amber-500/20 flex flex-wrap items-center gap-2 text-xs text-amber-300/80 font-mono">
          <FileCheck className="w-3.5 h-3.5" />
          <span>Cross-verified against:</span>
          {investigation.evidenceSources.map(src => (
            <span key={src} className="px-2 py-0.5 rounded bg-black/30 border border-amber-500/30 text-[11px]">
              {src}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
