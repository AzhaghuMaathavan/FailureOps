'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, TrendingUp, Sparkles, Database, ArrowRight, ShieldCheck, FileCheck } from 'lucide-react';
import { SaveMemoryModal } from '@/components/memory/SaveMemoryModal';

export default function OutcomeVerificationPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Empirical Verification
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Hypothesis Supported
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Outcome Verification & Metric Lift
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compare pre-intervention baseline telemetry against post-intervention experiment cohort results.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-[0_0_15px_-3px_rgba(255,122,0,0.4)]"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Save to Org Memory</span>
        </button>
      </div>

      {/* Outcome Metric Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm text-center">
          <span className="text-xs font-mono text-muted-foreground uppercase">Control Baseline</span>
          <span className="text-4xl font-extrabold font-mono text-rose-400 block my-2">31%</span>
          <span className="text-xs text-muted-foreground">7-step mandatory compliance flow</span>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-emerald-500/40 shadow-sm text-center">
          <span className="text-xs font-mono text-emerald-400 uppercase font-bold">Treatment Cohort</span>
          <span className="text-4xl font-extrabold font-mono text-emerald-400 block my-2">64%</span>
          <span className="text-xs text-muted-foreground">3-step progressive onboarding sandbox</span>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-card via-card to-primary/10 border border-primary/40 shadow-md text-center">
          <span className="text-xs font-mono text-primary uppercase font-bold">Net Improvement</span>
          <span className="text-4xl font-extrabold font-mono text-primary block my-2">+33 pp</span>
          <span className="text-xs text-emerald-400 font-mono font-semibold">Statistically Validated (p &lt; 0.001)</span>
        </div>
      </div>

      {/* Distinction: Observed Outcome vs AI Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Observed Empirical Data</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            Activation rate increased from 31% to 64% in the 50-user treatment cohort. Support inquiries citing account setup drop-offs decreased by 64%.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/30 shadow-md space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-4 h-4" />
            <span>AI Epistemic Interpretation</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            The intervention appears to have eliminated the primary conversion bottleneck by deferring KYC compliance until after users achieve time-to-first-value.
          </p>
        </div>
      </div>

      {/* Memory Commit Banner */}
      <div className="p-6 rounded-2xl bg-surface-feed border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-foreground">Commit Validated Knowledge to Institutional Memory</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store this verified pattern and recovery outcome into organizational memory for future team discovery.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wide transition-all shadow-sm shrink-0"
        >
          Commit Learning Now
        </button>
      </div>

      <SaveMemoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
