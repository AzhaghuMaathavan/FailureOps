'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FlaskConical, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ExperimentWidget } from '@/components/intervention/ExperimentWidget';

export default function ExperimentPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { experiment } = useApp();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Empirical Experimentation
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              A/B Validation Cohort
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Intervention Experiment Runner
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test the prescribed 3-step progressive onboarding intervention against the control baseline.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/outcomes`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm"
        >
          <span>Verify Outcomes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ExperimentWidget experiment={experiment} projectId={projectId} />

    </div>
  );
}
