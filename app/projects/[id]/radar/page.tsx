'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { TrajectoryChart } from '@/components/radar/TrajectoryChart';
import { RiskBadge } from '@/components/common/RiskBadge';

const cardShadow = 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]';

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

  const overallRisk = snapshot?.overall_risk_score ?? snapshot?.executive_summary?.overall_risk_score;
  const overallHealth = snapshot?.overall_health || snapshot?.executive_summary?.health_status || 'INSUFFICIENT_EVIDENCE';
  const velocity = snapshot?.risk_velocity || snapshot?.executive_summary?.risk_velocity || 'UNKNOWN';
  const topRisks = snapshot?.top_failure_risks || snapshot?.top_risks || [];
  const predictedFailure = snapshot?.predicted_next_failure || snapshot?.executive_summary?.top_failure_risk || 'Insufficient evidence for a reliable failure prediction.';
  const recommendedAction = snapshot?.recommended_primary_action || snapshot?.executive_summary?.primary_recommended_action || 'Insufficient evidence for a recommended action';
  const primaryPriority = snapshot?.primary_action_priority;
  const activeExpTitle = snapshot?.active_experiment_title || null;
  const activeExpProgress = snapshot?.active_experiment_progress ?? 0;
  const recoveryDelta = snapshot?.best_historical_recovery_delta || null;
  const trajectory = snapshot?.risk_trajectory_history || snapshot?.trajectory || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            Executive Decision Support
          </p>
          <h1 className="text-[28px] font-extrabold text-foreground tracking-tight">
            Failure Radar
          </h1>
          <p className="text-[13px] text-muted-foreground max-w-xl">
            What to worry about, what to do, and whether the intervention is working.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/simulation`}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all duration-200 shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          Open Simulation
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Project risk</p>
          <p className="font-mono text-[26px] font-bold leading-none text-destructive">
            {loading ? '—' : typeof overallRisk === 'number' ? `${overallRisk}%` : 'n/a'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">Health {overallHealth}</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Velocity</p>
          <p className="font-mono text-[26px] font-bold leading-none text-warning truncate">{velocity}</p>
          <p className="text-[11px] text-muted-foreground truncate">{predictedFailure}</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Action priority</p>
          <p className="font-mono text-[26px] font-bold leading-none text-primary">
            {typeof primaryPriority === 'number' ? primaryPriority : 'n/a'}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{recommendedAction}</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Recovery delta</p>
          <p className="font-mono text-lg sm:text-[26px] font-bold leading-tight text-success truncate">
            {recoveryDelta || 'n/a'}
          </p>
          <p className="text-[11px] text-muted-foreground">Historical best</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`flex flex-col gap-2.5 p-[18px] rounded-[14px] bg-card border border-border ${cardShadow}`}>
          <h2 className="text-sm font-semibold text-foreground">Risk trajectory · 30d</h2>
          <TrajectoryChart data={trajectory} />
        </div>
        <div className={`flex flex-col gap-2 p-[18px] rounded-[14px] bg-card border border-border ${cardShadow}`}>
          <h2 className="text-sm font-semibold text-foreground">Top failure risks</h2>
          {topRisks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No ranked failure risks yet.</p>
          ) : (
            <ol className="space-y-2">
              {topRisks.slice(0, 5).map((risk: any, idx: number) => (
                <li key={idx} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">{idx + 1}. {risk.name}</span>
                    {risk.dimension ? ` — ${risk.dimension}` : ''}
                  </span>
                  <RiskBadge level={risk.risk_level || 'HIGH'} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className={`p-[18px] rounded-[14px] bg-card border border-border ${cardShadow} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-success" aria-hidden="true" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-success">
              Do this next
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{activeExpTitle || recommendedAction}</h3>
          <p className="text-xs text-muted-foreground">
            {activeExpTitle
              ? `Current progress: ${activeExpProgress}%`
              : 'No backend experiment is currently running for this project.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`/projects/${projectId}/experiment`}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] bg-surface-feed border border-border text-foreground text-xs font-bold hover:bg-card transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View Experiment
          </Link>
          <Link
            href={`/projects/${projectId}/outcomes`}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all duration-200 shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Verify Outcomes
          </Link>
        </div>
      </div>
    </div>
  );
}
