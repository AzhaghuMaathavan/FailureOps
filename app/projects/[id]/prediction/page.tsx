'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Compass, AlertOctagon, ArrowDown, Lightbulb, ArrowRight, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function PredictionPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project } = useApp();

  const reasoningSteps = [
    { title: 'Engineering Overload & Overtime Spikes (58 hrs/wk)', category: 'Operational Drag' },
    { title: 'Code Review Idle Latency Expands to 3.4 Days', category: 'Bottleneck' },
    { title: 'Testing Coverage Erosion (12 Suites Quarantined)', category: 'Quality Deficit' },
    { title: 'Deployment Pipeline Breakage Surges to 28.6%', category: 'CI/CD Paralysis' },
    { title: 'Compounding P1/P2 Bug Backlog (+311% Growth)', category: 'Regression Debt' },
    { title: 'Sprint Feature Velocity Declines by -38%', category: 'Delivery Drag' },
    { title: 'Zero Slack Remaining for October 15 Beta Milestone', category: 'Milestone Breach' },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Probabilistic Forecast
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
              High Probability Horizon
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Predicted Next Failure Milestone
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Most probable next failure trajectory synthesized from cross-source velocity decay and historical case matching.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/interventions`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Prescribed Interventions</span>
        </Link>
      </div>

      {/* Main Forecast Hero Card */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-card via-card to-rose-950/20 border border-rose-500/40 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Compass className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                Most Probable Failure Horizon
              </span>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {project.predictedNextFailure}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase block">Probability</span>
              <span className="text-2xl font-extrabold text-rose-400">82%</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase block">Confidence</span>
              <span className="text-2xl font-extrabold text-primary">{project.predictionConfidence}%</span>
            </div>
          </div>
        </div>

        {/* Disclaimer / Probability Note */}
        <div className="p-3.5 rounded-xl bg-surface-feed/80 border border-border/80 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-foreground">Epistemic Caution: </span>
            This forecast models the most probable outcome if current operational friction and pipeline failure rates continue unchecked. It is a trajectory forecast, not an inevitable destiny.
          </p>
        </div>

        {/* Step-by-Step Causal Reasoning Chain */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Forecasted Causal Progression Chain
          </h3>
          <div className="space-y-2">
            {reasoningSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-feed/70 border border-border/70 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-[11px] font-mono font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-foreground">{step.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-medium">
                    {step.category}
                  </span>
                </div>
                {idx < reasoningSteps.length - 1 && (
                  <div className="flex justify-center my-0.5">
                    <ArrowDown className="w-3.5 h-3.5 text-border" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            Historical precedent: Project Atlas and Nova exhibited identical trajectories.
          </span>
          <Link
            href={`/projects/${projectId}/interventions`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-wide uppercase transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Examine Recovery Interventions</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
