'use client';

import React from 'react';
import { AssumptionInvestigation } from '@/types';
import { Scale, AlertOctagon, CheckCircle2, HelpCircle, FileCheck } from 'lucide-react';

interface AssumptionCardProps {
  investigation: AssumptionInvestigation;
}

const STATUS_META = {
  CHALLENGED: {
    claimBadge: 'UNSUPPORTED',
    evidenceBadge: 'CORROBORATED',
    claimBadgeClass: 'border-destructive text-destructive',
    evidenceBadgeClass: 'border-success text-success',
    bannerClass: 'bg-warning/10 border-warning/30',
    BannerIcon: AlertOctagon,
    bannerLabel: 'Assumption challenged',
    iconWrap: 'bg-warning/20 border-warning/40 text-warning',
  },
  SUPPORTED: {
    claimBadge: 'SUPPORTED',
    evidenceBadge: 'ALIGNED',
    claimBadgeClass: 'border-success text-success',
    evidenceBadgeClass: 'border-success text-success',
    bannerClass: 'bg-success/10 border-success/30',
    BannerIcon: CheckCircle2,
    bannerLabel: 'Assumption supported',
    iconWrap: 'bg-success/20 border-success/40 text-success',
  },
  INCONCLUSIVE: {
    claimBadge: 'INCONCLUSIVE',
    evidenceBadge: 'INSUFFICIENT',
    claimBadgeClass: 'border-warning text-warning',
    evidenceBadgeClass: 'border-muted-foreground text-muted-foreground',
    bannerClass: 'bg-info/10 border-info/30',
    BannerIcon: HelpCircle,
    bannerLabel: 'Inconclusive',
    iconWrap: 'bg-info/20 border-info/40 text-info',
  },
} as const;

export const AssumptionCard: React.FC<AssumptionCardProps> = ({ investigation }) => {
  const meta = STATUS_META[investigation.status] || STATUS_META.INCONCLUSIVE;
  const BannerIcon = meta.BannerIcon;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 p-[18px] rounded-[14px] bg-card border border-border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <h3 className="text-sm font-semibold text-foreground">Claim in the room</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {investigation.assumptionText}
          </p>
          <span className={`mt-1 inline-flex self-start px-2 py-1 rounded-full text-[10px] font-mono font-medium border bg-surface-feed ${meta.claimBadgeClass}`}>
            {meta.claimBadge}
          </span>
        </div>

        <div className="flex flex-col gap-2 p-[18px] rounded-[14px] bg-card border border-border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <h3 className="text-sm font-semibold text-foreground">What the evidence says</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {investigation.alternativeExplanation}
          </p>
          <span className={`mt-1 inline-flex self-start px-2 py-1 rounded-full text-[10px] font-mono font-medium border bg-surface-feed ${meta.evidenceBadgeClass}`}>
            {meta.evidenceBadge}
          </span>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-card border border-border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" aria-hidden="true" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Empirical Evidence Review
            </h4>
          </div>
          <span className="text-xs font-mono text-success font-semibold">
            {investigation.confidence}% Confidence
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {investigation.evidenceMetrics.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border ${
                m.isContradiction
                  ? 'bg-destructive/10 border-destructive/40 text-foreground'
                  : 'bg-surface-feed border-border text-foreground'
              }`}
            >
              <span className="text-xs text-muted-foreground block truncate">{m.label}</span>
              <div className="flex items-baseline justify-between mt-2 gap-2">
                <span className="text-2xl font-extrabold font-mono">{m.value}</span>
                {m.isContradiction && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-bold border border-destructive/30">
                    CONTRADICTION
                  </span>
                )}
              </div>
              <div className="w-full bg-border/40 h-1 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.isContradiction ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${m.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-6 rounded-[14px] border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] ${meta.bannerClass}`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.iconWrap}`}>
            <BannerIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-surface-feed border border-border text-foreground">
                {meta.bannerLabel}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Confidence: {investigation.confidence}%
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {investigation.findingSummary}
            </p>
            <p className="text-xs text-muted-foreground">{investigation.teamBelief}</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
          <FileCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Cross-verified against:</span>
          {investigation.evidenceSources.map(src => (
            <a
              key={src}
              href={`/api/documents/${encodeURIComponent(src)}/download?projectId=${encodeURIComponent(investigation.projectId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-surface-feed border border-border text-[11px] text-primary font-bold hover:underline hover:bg-card transition-colors cursor-pointer"
            >
              {src}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
