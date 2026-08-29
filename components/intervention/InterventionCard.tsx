'use client';

import React from 'react';
import Link from 'next/link';
import { Intervention } from '@/types';
import { Lightbulb, CheckCircle2, History, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface InterventionCardProps {
  intervention: Intervention;
  onLaunchExperiment?: (interventionId: string) => void;
}

export const InterventionCard: React.FC<InterventionCardProps> = ({
  intervention,
  onLaunchExperiment,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md hover:border-primary/40 transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Lightbulb className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
            Recommended Prescription
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {intervention.historicalEvidenceStrength}% Evidence Strength
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
            {intervention.expectedImpact} Impact
          </span>
        </div>
      </div>

      <h3 className="text-lg font-bold text-foreground tracking-tight">{intervention.title}</h3>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{intervention.summary}</p>

      {/* Action Items */}
      <div className="mt-5 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Prescribed Actions:</h4>
        <div className="space-y-1.5">
          {intervention.actionItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-feed/70 border border-border/60 text-xs text-foreground font-medium"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Precedent Backing */}
      <div className="mt-5 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs">
        <div className="flex items-center gap-2 text-purple-300 font-semibold mb-1">
          <History className="w-3.5 h-3.5 text-purple-400" />
          <span>Historical Validation ({intervention.similarCasesSucceeded})</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {intervention.backedByCases.map(c => (
            <span
              key={c}
              className="px-2.5 py-1 rounded-lg bg-black/40 border border-purple-500/40 text-[11px] font-mono text-purple-200"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">Prescription ID: {intervention.id}</span>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${intervention.projectId}/experiment`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Experiment</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
