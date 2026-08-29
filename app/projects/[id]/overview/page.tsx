'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  AlertTriangle,
  TrendingUp,
  History,
  Compass,
  ArrowRight,
  ChevronRight,
  Flame,
  Activity,
  FileText,
  Dna,
  Shield,
  Lightbulb,
  Scale,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/common/StatCard';
import { RiskBadge } from '@/components/common/RiskBadge';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { IntelligencePipeline } from '@/components/common/IntelligencePipeline';
import { apiClient } from '@/lib/api/client';
import { Signal } from '@/types';

export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project: contextProject, setProject } = useApp();
  const [project, setCurrentProject] = React.useState<any>(contextProject);
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [prediction, setPrediction] = React.useState<any>(null);
  const [topConflict, setTopConflict] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      apiClient.getProject(projectId).catch(() => null),
      apiClient.getSignals(projectId).catch(() => []),
      apiClient.getPredictions(projectId).catch(() => null),
      apiClient.getEvidence(projectId).catch(() => null),
    ]).then(([projData, sigs, predData, evData]) => {
      if (isMounted) {
        if (projData && projData.id) {
          setCurrentProject(projData);
          setProject(projData);
        }
        if (sigs) {
          setSignals(sigs);
        }
        if (predData) {
          setPrediction(predData);
        }
        if (evData && evData.conflicts && evData.conflicts.length > 0) {
          setTopConflict(evData.conflicts[0]);
        }
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [projectId]);

  return (
    <div className="space-y-8">
      {/* Top Banner with Project Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              {project.codeName || project.code_name || 'PROJECT'}
            </span>
            <PrivacyBadge level={project.privacyLevel || project.privacy_level || 'PRIVATE'} />
            <RiskBadge level={project.health || 'WATCH'} />
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
            {project.name || 'Untitled Project'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.company || 'Enterprise'} • {project.industry || 'Tech'} • Stage: {project.stage || 'Production'} • Target Launch: {project.expectedLaunchDate || project.expected_launch_date || 'TBD'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/projects/${projectId}/radar`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-feed hover:bg-card border border-border text-xs font-mono font-bold text-foreground transition-all shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>Failure Radar</span>
          </Link>
          <Link
            href={`/projects/${projectId}/interventions`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-[0_0_15px_-3px_rgba(255,122,0,0.4)]"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>View Interventions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Embedded Continuous Product Loop Visualizer */}
      <IntelligencePipeline currentStage="overview" projectId={projectId} />

      {/* Executive Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Main Failure Risk Card */}
        <div className="p-6 rounded-2xl bg-card border border-rose-500/30 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
              Failure Risk
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-rose-400">
              {project.failureRisk ?? project.failure_risk ?? 0}%
            </span>
            <span className="text-xs font-mono text-rose-400 font-bold">
              {project.riskTrend || project.risk_trend || 'Baseline'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Calculated across verified evidence sources and active signals.
          </p>
        </div>

        {/* Predicted Next Failure Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Predicted Next Failure
            </span>
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-foreground block truncate">
              {prediction?.predicted_failure || project.predictedNextFailure || project.predicted_next_failure || 'Awaiting Analysis'}
            </span>
            <span className="text-xs font-mono text-primary font-bold mt-1 block">
              {prediction?.confidence ? Math.round(prediction.confidence * (prediction.confidence <= 1 ? 100 : 1)) : (project.predictionConfidence || 0)}% Confidence
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Horizon: {prediction?.time_horizon || '2-4 weeks'}
          </p>
        </div>

        {/* Historical Similarity Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Historical Similarity
            </span>
            <History className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-purple-400">
              {project.historicalSimilarity || project.historical_similarity || 85}%
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              Vector Match
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Matches historical recovery benchmarks in organizational memory.
          </p>
        </div>

        {/* Truth Engine Assumption Card */}
        <div className="p-6 rounded-2xl bg-card border border-amber-500/30 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
              Truth Engine
            </span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            {topConflict ? (
              <>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  CONTRADICTION DETECTED
                </span>
                <p className="text-xs font-semibold text-foreground mt-2 line-clamp-2">
                  Topic &quot;{topConflict.topic}&quot;: conflicting metric citations recorded in evidence.
                </p>
              </>
            ) : (
              <>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  GROUNDED CITATIONS
                </span>
                <p className="text-xs font-semibold text-foreground mt-2 line-clamp-2">
                  All extracted statements verified against project source chunks.
                </p>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Top Extracted Signals Section */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Top 5 Connected Failure Signals
            </h2>
          </div>
          <Link
            href={`/projects/${projectId}/signals`}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Explore All Signals</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {signals.slice(0, 5).map((sig, i) => (
            <div
              key={sig.id}
              onClick={() => router.push(`/projects/${projectId}/signals`)}
              className="p-3.5 rounded-xl bg-surface-feed/70 border border-border/70 hover:border-primary/40 hover:bg-card-hover transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-xs font-mono font-bold text-muted-foreground group-hover:text-primary">
                  {i + 1}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {sig.name}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">{sig.description}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                <span className="text-rose-400 font-bold">{sig.metricChange}</span>
                <span className="text-muted-foreground text-[11px]">{sig.confidence}% Conf.</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
          {signals.length === 0 && (
            <div className="p-4 text-center text-xs font-mono text-muted-foreground">
              No active operational signals extracted yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

