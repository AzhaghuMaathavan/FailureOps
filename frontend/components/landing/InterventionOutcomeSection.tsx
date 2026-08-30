'use client';

import React from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { btnPrimary } from './chrome';

export const InterventionOutcomeSection: React.FC = () => {
  return (
    <section className="w-full py-16 sm:py-24 bg-surface-base border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Closed-Loop Resolution</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Intervene, Experiment, and Verify Recovery
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Finding risk is only half the battle. FailureOps X generates prioritized corrective playbooks, helps you run structured experiments, and measures the empirical lift to make your organization smarter.
          </p>
        </div>

        {/* 3-Step Horizontal Loop Card Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Intervention Playbook */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary uppercase">
                  Step 1: Prescribe
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  Mathematical Intervention Plan
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Playbooks are ranked by formula: (Risk Severity × Prediction Confidence × Impact) ÷ Effort Weight. Focus engineering bandwidth on maximum risk reduction.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-feed border border-border text-xs font-mono space-y-1">
              <span className="text-muted-foreground">Expected Risk Reduction:</span>
              <span className="font-bold text-primary block text-sm">-32% overall project risk</span>
            </div>
          </div>

          {/* Card 2: Controlled Experiment */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-warning/10 text-warning w-fit">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-warning/15 text-warning uppercase">
                  Step 2: Test
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  Structured Verification Experiment
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Define measurable hypotheses with explicit target metrics (e.g. step-2 completion rate &gt; 80%) before broad rollouts.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-feed border border-border text-xs font-mono space-y-1">
              <span className="text-muted-foreground">Verification Horizon:</span>
              <span className="font-bold text-foreground block text-sm">14 days post-deployment</span>
            </div>
          </div>

          {/* Card 3: Validated Outcome & Memory */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase">
                  Step 3: Remember
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  Verified Learning to Memory
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Once telemetry proves recovery lift, the successful intervention is committed to Organizational Memory so future project teams inherit the playbook.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono space-y-1">
              <span className="text-emerald-400">Measured Recovery Lift:</span>
              <span className="font-bold text-emerald-400 block text-sm">+21pp activation lift verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
