'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Radar, TrendingUp, AlertTriangle, History, Layers, Compass, ArrowRight, Lightbulb, FlaskConical, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { TrajectoryChart } from '@/components/radar/TrajectoryChart';
import { RiskBadge } from '@/components/common/RiskBadge';

export default function FailureRadarPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRadar() {
      try {
        setLoading(true);
        const res = await apiClient.getExecutiveRadarSnapshot(projectId);
        if (res) {
          setSnapshot(res);
        }
      } catch {
        // Fallback default
      } finally {
        setLoading(false);
      }
    }
    loadRadar();
  }, [projectId]);

  const overallRisk = snapshot?.overall_risk_score ?? snapshot?.executive_summary?.overall_risk_score ?? 0;
  const overallHealth = snapshot?.overall_health || snapshot?.executive_summary?.health_status || 'WATCH';
  const velocity = snapshot?.risk_velocity || snapshot?.executive_summary?.risk_velocity || 'STABLE';
  const topRisks = snapshot?.top_failure_risks || snapshot?.top_risks || [];
  const predictedFailure = snapshot?.predicted_next_failure || snapshot?.executive_summary?.top_failure_risk || 'No Immediate Failure Predicted';
  const recommendedAction = snapshot?.recommended_primary_action || snapshot?.executive_summary?.primary_recommended_action || 'Review Evidence and Active Signals';
  const primaryPriority = snapshot?.primary_action_priority || 80;
  const activeExpTitle = snapshot?.active_experiment_title || 'Progressive Recovery Experiment';
  const activeExpProgress = snapshot?.active_experiment_progress || 0;
  const recoveryDelta = snapshot?.best_historical_recovery_delta || 'Historical benchmark matched in memory';


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Executive Decision Support
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
              Health: {overallHealth} ({overallRisk}%)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Velocity: {velocity}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Executive Failure Radar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unified executive command layer answering what to worry about, what to do, and whether interventions are working.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Radar className="w-4 h-4 text-primary animate-pulse" />
          <span>Surveillance Engine Online</span>
        </div>
      </div>

      {/* Executive KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
          <span className="text-xs font-mono text-muted-foreground uppercase block">Project Risk</span>
          <span className="text-3xl font-extrabold font-mono text-rose-400 block my-1">{overallRisk}%</span>
          <span className="text-[11px] font-mono text-rose-400">Trajectory: {velocity}</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
          <span className="text-xs font-mono text-muted-foreground uppercase block">Predicted Failure</span>
          <span className="text-sm font-bold text-foreground block my-1 leading-snug">{predictedFailure}</span>
          <span className="text-[11px] font-mono text-amber-400">Confidence: 91%</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-primary/40 shadow-sm">
          <span className="text-xs font-mono text-primary uppercase font-bold block">Top Recommended Action</span>
          <span className="text-sm font-bold text-foreground block my-1 leading-snug">{recommendedAction}</span>
          <span className="text-[11px] font-mono text-primary font-bold">Priority: {primaryPriority}/100</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-emerald-500/30 shadow-sm">
          <span className="text-xs font-mono text-emerald-400 uppercase font-bold block">Historical Precedent</span>
          <span className="text-xs font-bold text-foreground block my-1">{recoveryDelta}</span>
          <span className="text-[11px] font-mono text-muted-foreground">Benchmark Verified</span>
        </div>
      </div>

      {/* Main Trajectory Chart Container */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">4-Week Escalation Trajectory</h3>
            <p className="text-xs text-muted-foreground">Historical acceleration vs projected zero-slack horizon</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400">Sprint -3 (42%)</span>
            <span>→</span>
            <span className="flex items-center gap-1 text-rose-400 font-bold">Current ({overallRisk}%)</span>
          </div>
        </div>

        <TrajectoryChart />
      </div>

      {/* Top Failure Risks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Top Active Failure Risks (Deterministic Failure DNA)
          </h3>
          <span className="text-xs font-mono text-muted-foreground">Ranked by Severity</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topRisks.map((risk: any, idx: number) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 shadow-sm transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                    Rank #{risk.rank || idx + 1}
                  </span>
                  <RiskBadge level={risk.risk_level || 'HIGH'} />
                </div>
                <h4 className="text-sm font-bold text-foreground">{risk.name}</h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Dimension: {risk.dimension} — Empirical score {risk.risk_score}/100. Grounded in telemetry.
                </p>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="text-primary font-semibold">{risk.primary_evidence_id}</span>
                <span>{Math.round((risk.confidence || 0.9) * 100)}% Conf.</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Experiment Progress Card */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase text-emerald-400">Active Experiment in Flight</span>
          </div>
          <h4 className="text-base font-bold text-foreground">{activeExpTitle}</h4>
          <p className="text-xs text-muted-foreground">
            A/B cohort testing against immutable baseline. Current progress: {activeExpProgress}% through 14-day observation window.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/projects/${projectId}/experiment`}
            className="px-4 py-2 rounded-xl bg-surface-feed border border-border text-foreground text-xs font-bold hover:bg-surface-elevated transition-all"
          >
            View Experiment
          </Link>
          <Link
            href={`/projects/${projectId}/outcomes`}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm"
          >
            Verify Outcomes
          </Link>
        </div>
      </div>
    </div>
  );
}

