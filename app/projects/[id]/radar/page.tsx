'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Radar, TrendingUp, AlertTriangle, History, Layers, Compass, ArrowRight } from 'lucide-react';
import { TrajectoryChart } from '@/components/radar/TrajectoryChart';
import { RiskBadge } from '@/components/common/RiskBadge';

export default function FailureRadarPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';

  const seeds = [
    {
      name: 'Deployment Pipeline Instability',
      severity: 'HIGH' as const,
      leadTime: '12 Days to Failure Cascade',
      impact: 'Blocks staging regression verification; causes unspotted defect rollbacks.',
      confidence: 96,
    },
    {
      name: 'Critical Onboarding Gate Drop-off',
      severity: 'HIGH' as const,
      leadTime: 'Immediate (Active Churn)',
      impact: '69% of trial signups abandon before completing first expense upload.',
      confidence: 98,
    },
    {
      name: 'Engineering Overtime & Cognitive Fatigue',
      severity: 'WARNING' as const,
      leadTime: '18 Days to Critical Turnover',
      impact: '58h workweek causing 3.4-day PR review idle queues and merge thrash.',
      confidence: 92,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Continuous Risk Trajectory
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
              Active Risk: 82% (Critical)
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Failure Radar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Failure Radar compares current project evidence against historical patterns to model future mortality trajectories.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Radar className="w-4 h-4 text-primary animate-pulse" />
          <span>Continuous Anomaly Surveillance</span>
        </div>
      </div>

      {/* Trajectory Formulation Flow Banner */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 text-xs text-muted-foreground font-mono flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-foreground font-bold">RADAR FORMULA:</span>
          <span>5 Evidence Sources</span>
          <span>+</span>
          <span>5 Extracted Signals</span>
          <span>+</span>
          <span>89% Historical Similarity</span>
          <span>→</span>
          <span className="text-rose-400 font-bold">82% Composite Failure Risk</span>
        </div>
        <span className="text-primary font-bold">Not Manually Entered</span>
      </div>

      {/* Main Trajectory Chart Container */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">4-Week Escalation Trajectory</h3>
            <p className="text-xs text-muted-foreground">Historical acceleration vs projected zero-slack horizon</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400">Week 1 (32%)</span>
            <span>→</span>
            <span className="flex items-center gap-1 text-rose-400 font-bold">Week 4 (82%)</span>
          </div>
        </div>

        <TrajectoryChart />
      </div>

      {/* Emerging Failure Seeds Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Emerging Failure Seeds (Latent Vulnerabilities)
          </h3>
          <span className="text-xs font-mono text-muted-foreground">3 Unmitigated Seeds</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {seeds.map((seed, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 shadow-sm transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                    Seed #{idx + 1}
                  </span>
                  <RiskBadge level={seed.severity} />
                </div>
                <h4 className="text-sm font-bold text-foreground">{seed.name}</h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{seed.impact}</p>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="text-amber-400 font-semibold">{seed.leadTime}</span>
                <span>{seed.confidence}% Conf.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
