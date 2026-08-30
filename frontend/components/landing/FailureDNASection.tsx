'use client';

import React, { useState } from 'react';
import {
  Dna,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Code2,
  Cpu,
  Users,
  Activity,
  DollarSign,
  Briefcase,
  Target,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const FailureDNASection: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'healthy' | 'elevated'>('healthy');

  return (
    <section className="w-full py-16 sm:py-24 bg-surface-base border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Dna className="w-3.5 h-3.5" />
            <span>Multidimensional Risk Profiling</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Failure DNA: The 8 Dimensions of Project Health
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            FailureOps X does not manufacture false alarms. It measures multi-source evidence across 8 distinct dimensions, giving you balanced clarity whether your project is thriving or drifting.
          </p>
        </div>

        {/* Toggle Mode: Healthy vs Elevated */}
        <div className="mt-8 flex justify-center">
          <div className="p-1 rounded-xl bg-card border border-border inline-flex items-center gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveMode('healthy')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
                activeMode === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Healthy Project Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('elevated')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
                activeMode === 'elevated'
                  ? 'bg-warning/20 text-warning border border-warning/30'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              <span>Elevated Risk Profile</span>
            </button>
          </div>
        </div>

        {/* Comparison Showcase Container */}
        <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase',
                    activeMode === 'healthy'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-warning/20 text-warning'
                  )}
                >
                  {activeMode === 'healthy' ? 'OVERALL RISK: LOW (21/100)' : 'OVERALL RISK: ELEVATED (68/100)'}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {activeMode === 'healthy' ? 'Trajectory: Stable & On Track' : 'Trajectory: Increasing Friction'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {activeMode === 'healthy'
                  ? 'Balanced Execution with Positive Evidence Corroboration'
                  : 'Early-Stage Signal Clustering on Adoption & Developer Overtime'}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono">
                {activeMode === 'healthy' ? '0 active failure seeds' : '3 active failure seeds'}
              </span>
            </div>
          </div>

          {/* 8 Dimension Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: 'adoption',
                name: 'Adoption',
                icon: Target,
                score: activeMode === 'healthy' ? 18 : 81,
                status: activeMode === 'healthy' ? '✓ Adoption stable' : '⚠ Activation deterioration',
                desc: activeMode === 'healthy' ? 'Trial conversion hitting 14-day targets' : 'Step-2 onboarding abandonment elevated',
              },
              {
                id: 'execution',
                name: 'Execution',
                icon: Briefcase,
                score: activeMode === 'healthy' ? 22 : 63,
                status: activeMode === 'healthy' ? '✓ Execution on track' : '⚠ Sprint milestone slip',
                desc: activeMode === 'healthy' ? 'Velocity steady at 28 PRs/week' : 'Core auth migration delayed 2 sprints',
              },
              {
                id: 'operational',
                name: 'Operational',
                icon: Users,
                score: activeMode === 'healthy' ? 15 : 71,
                status: activeMode === 'healthy' ? '✓ Team load balanced' : '⚠ Increasing team friction',
                desc: activeMode === 'healthy' ? 'Review times under 12 hours' : 'Engineer overtime up to 24h/week',
              },
              {
                id: 'technical',
                name: 'Technical',
                icon: Cpu,
                score: activeMode === 'healthy' ? 19 : 42,
                status: activeMode === 'healthy' ? '✓ Technical risk low' : '✓ Infrastructure stable',
                desc: activeMode === 'healthy' ? 'Zero critical error clusters' : 'Build failure rate up to 18%',
              },
              {
                id: 'quality',
                name: 'Quality',
                icon: CheckCircle2,
                score: activeMode === 'healthy' ? 12 : 68,
                status: activeMode === 'healthy' ? '✓ Defect backlog low' : '⚠ Bug inflow exceeding closure',
                desc: activeMode === 'healthy' ? 'P1/P2 defect count under 5' : 'Unresolved defects rose from 25 to 33',
              },
              {
                id: 'financial',
                name: 'Financial',
                icon: DollarSign,
                score: activeMode === 'healthy' ? 10 : 25,
                status: activeMode === 'healthy' ? '✓ Budget on plan' : '✓ Runaway spend low',
                desc: activeMode === 'healthy' ? 'Cloud infra spend within 5% budget' : 'Hosting costs aligned with projections',
              },
              {
                id: 'market',
                name: 'Market',
                icon: Activity,
                score: activeMode === 'healthy' ? 20 : 35,
                status: activeMode === 'healthy' ? '✓ Target ICP clear' : '✓ Competitive differentiation solid',
                desc: activeMode === 'healthy' ? 'Positive NPS across early cohort' : 'Product-market feedback remains receptive',
              },
              {
                id: 'team',
                name: 'Team Alignment',
                icon: Layers,
                score: activeMode === 'healthy' ? 14 : 58,
                status: activeMode === 'healthy' ? '✓ Cross-functional harmony' : '⚠ Context switching high',
                desc: activeMode === 'healthy' ? 'Product and dev roadmaps synced' : 'Jira tickets lack detailed PRD specs',
              },
            ].map((dim) => {
              const Icon = dim.icon;
              const isBad = dim.score > 50;
              return (
                <div
                  key={dim.id}
                  className="p-4 rounded-xl bg-surface-feed/70 border border-border/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-card text-primary">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{dim.name}</span>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold px-1.5 py-0.2 rounded',
                        dim.score > 75
                          ? 'bg-destructive/20 text-destructive'
                          : dim.score > 50
                          ? 'bg-warning/20 text-warning'
                          : 'bg-emerald-500/20 text-emerald-400'
                      )}
                    >
                      {dim.score}/100
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      isBad ? 'text-warning' : 'text-emerald-400'
                    )}
                  >
                    {dim.status}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {dim.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
