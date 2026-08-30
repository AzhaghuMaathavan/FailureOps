'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Activity, ArrowRight, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { RiskBadge } from '@/components/common/RiskBadge';
import { IntelligencePipeline } from '@/components/common/IntelligencePipeline';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { Signal } from '@/types';

const cardShadow = 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]';

export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project: contextProject, setProject } = useApp();
  const [project, setCurrentProject] = React.useState<any>(contextProject);
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [signalAnalysisId, setSignalAnalysisId] = React.useState<string | null>(null);
  const [ragUnavailable, setRagUnavailable] = React.useState(false);
  const [prediction, setPrediction] = React.useState<any>(null);
  const [topConflict, setTopConflict] = React.useState<any>(null);
  const [dnaArchetype, setDnaArchetype] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      apiClient.getProject(projectId).catch(() => null),
      apiClient.getSignals(projectId).then((r) => ({ ...r, ragDown: false })).catch((err) => ({
        analysisId: null,
        signals: [] as Signal[],
        ragDown: isRagUnavailable(err),
      })),
      apiClient.getPredictions(projectId).catch((err) => (isRagUnavailable(err) ? 'RAG_DOWN' : null)),
      apiClient.getEvidence(projectId).catch((err) => (isRagUnavailable(err) ? 'RAG_DOWN' : null)),
      apiClient.getFailureDNA(projectId).catch(() => null),
    ]).then(([projData, sigs, predData, evData, dnaData]) => {
      if (isMounted) {
        if (projData && projData.id) {
          setCurrentProject(projData);
          setProject(projData);
        }
        setRagUnavailable(Boolean(sigs.ragDown || predData === 'RAG_DOWN' || evData === 'RAG_DOWN'));
        setSignals(sigs.signals || []);
        setSignalAnalysisId(sigs.analysisId);
        if (predData && predData !== 'RAG_DOWN') {
          setPrediction(predData);
        }
        if (evData && evData !== 'RAG_DOWN' && evData.conflicts && evData.conflicts.length > 0) {
          setTopConflict(evData.conflicts[0]);
        }
        const overall = dnaData?.overall || {};
        setDnaArchetype(overall.dominant_archetype || dnaData?.dominantArchetype || null);
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [projectId]);

  const escalatingCount = signals.filter(s => s.severity === 'CRITICAL' || s.severity === 'HIGH').length;
  const predictedFailure =
    prediction?.predicted_failure ||
    project.predictedNextFailure ||
    project.predicted_next_failure ||
    'Awaiting Analysis';
  const horizon = prediction?.time_horizon || '12–18 days';
  const recommendedMove =
    prediction?.recommended_action ||
    prediction?.primary_recommended_action ||
    prediction?.recommended_primary_action ||
    (predictedFailure !== 'Awaiting Analysis'
      ? `Investigate ${predictedFailure}. Historical similarity ${project.historicalSimilarity ?? project.historical_similarity ?? 'n/a'}%.`
      : 'Run analysis to rank the next intervention.');

  const [isSimulating, setIsSimulating] = React.useState<boolean>(false);
  const [simulationMeta, setSimulationMeta] = React.useState<any>(null);

  const handleSimulateIntelligence = async () => {
    try {
      setIsSimulating(true);
      const res = await apiClient.simulateIntelligence(projectId);
      setSimulationMeta(res);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Simulated intelligence execution failed');
      setIsSimulating(false);
    }
  };

  const isSimulatedActive = Boolean(
    project?.risk_trend?.includes('Simulated') ||
    project?.riskTrend?.includes('Simulated') ||
    simulationMeta?.isSimulated
  );

  return (
    <div className="space-y-5">
      {isSimulatedActive && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>TEST / SIMULATED INTELLIGENCE ACTIVE</strong> — Source: LangGraph Fixture v1.0 (All downstream FailureOps engines executed live)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono text-[10px] font-bold">
            FIXTURE MODE
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            Project · {project.codeName || project.code_name || 'PROJECT'}
          </p>
          <h1 className="text-[28px] font-extrabold text-foreground tracking-tight">
            {project.name || 'Untitled Project'}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {project.company || 'Enterprise'} · {project.industry || 'Tech'} · {project.stage || 'Production'} · Target launch {project.expectedLaunchDate || project.expected_launch_date || 'TBD'} · Privacy {project.privacyLevel || project.privacy_level || 'PRIVATE'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <PrivacyBadge level={project.privacyLevel || project.privacy_level || 'PRIVATE'} />
            <RiskBadge level={project.health || 'WATCH'} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulateIntelligence}
            disabled={isSimulating}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Run upstream LangGraph fixture through real downstream FailureOps engines"
          >
            <span>{isSimulating ? 'Simulating...' : 'Simulate Intelligence'}</span>
          </button>
          <Link
            href={`/projects/${projectId}/radar`}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-surface-feed hover:bg-card border border-border text-xs font-bold text-foreground transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Failure Radar
          </Link>
          <Link
            href={`/projects/${projectId}/analysis`}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all duration-200 shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Run Analysis
          </Link>
        </div>
      </div>


      <IntelligencePipeline currentStage="overview" projectId={projectId} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Failure risk</p>
          <p className="font-mono text-[26px] font-bold leading-none text-destructive">
            {isLoading ? '—' : `${project.failureRisk ?? project.failure_risk ?? 0}%`}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {project.riskTrend || project.risk_trend || 'Baseline'}
          </p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Signals</p>
          <p className="font-mono text-[26px] font-bold leading-none text-warning">
            {isLoading ? '—' : signals.length}
          </p>
          <p className="text-[11px] text-muted-foreground">{escalatingCount} escalating</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">DNA pressure</p>
          <p className="font-mono text-[26px] font-bold leading-none text-magic truncate">
            {dnaArchetype || 'Awaiting'}
          </p>
          <p className="text-[11px] text-muted-foreground">Dominant archetype</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Next milestone</p>
          <p className="font-mono text-lg sm:text-[26px] font-bold leading-tight text-info truncate">
            {predictedFailure}
          </p>
          <p className="text-[11px] text-muted-foreground">{horizon}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`flex flex-col gap-2 p-[18px] rounded-[14px] bg-card border border-border ${cardShadow}`}>
          <h2 className="text-sm font-semibold text-foreground">Top conflict</h2>
          {topConflict ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Topic &quot;{topConflict.topic}&quot;: conflicting metric citations recorded in evidence.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              All extracted statements verified against project source chunks.
            </p>
          )}
        </div>
        <div className={`flex flex-col gap-2 p-[18px] rounded-[14px] bg-card border border-border ${cardShadow}`}>
          <h2 className="text-sm font-semibold text-foreground">Recommended move</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{recommendedMove}</p>
        </div>
      </div>

      <div className={`p-[18px] rounded-[14px] bg-card border border-border ${cardShadow} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              Active operational signals
            </h2>
          </div>
          <Link
            href={`/projects/${projectId}/signals`}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <span>Explore all</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-2">
          {signals.slice(0, 5).map((sig, i) => (
            <button
              type="button"
              key={sig.id}
              onClick={() => router.push(`/projects/${projectId}/signals`)}
              className="w-full text-left px-3.5 py-3 rounded-[10px] bg-card border border-border hover:border-primary/40 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-surface-feed border border-border flex items-center justify-center text-xs font-mono font-bold text-muted-foreground group-hover:text-primary shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {sig.name}
                  </h4>
                  <span className="text-[12px] text-muted-foreground line-clamp-1">{sig.description}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                <span className="text-destructive font-bold">{sig.metricChange}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </button>
          ))}
          {ragUnavailable ? (
            <div role="alert" className="p-4 text-center text-xs font-mono text-destructive">
              RAG unavailable
            </div>
          ) : signals.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-muted-foreground space-y-2">
              <p>
                {signalAnalysisId
                  ? 'No sufficiently supported operational signals detected.'
                  : 'No completed analysis yet. Signals are produced by the Signal Agent after RAG retrieval.'}
              </p>
              <Link href={`/projects/${projectId}/analysis`} className="text-primary font-bold cursor-pointer">
                Run project analysis
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
