'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Mail,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
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
  const [project, setCurrentProject] = useState<any>(contextProject);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalAnalysisId, setSignalAnalysisId] = useState<string | null>(null);
  const [ragUnavailable, setRagUnavailable] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [topConflict, setTopConflict] = useState<any>(null);
  const [dnaArchetype, setDnaArchetype] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('contact@shyxon.com');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
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

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationMeta, setSimulationMeta] = useState<any>(null);

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

  const handleSendEmailAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;

    setIsSendingEmail(true);
    setEmailSuccess(null);
    setEmailError(null);

    try {
      const res = await fetch('/api/email/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: recipientEmail,
          project_name: project.name || projectId,
          risk_score: project.failureRisk ?? project.failure_risk ?? 68,
          predicted_failure: predictedFailure,
          emerging_pattern: `${signals.length} operational signals detected with ${escalatingCount} escalating.`,
          confidence: 85,
          playbook_title: recommendedMove,
          dashboard_url: `https://failureops.shyxon.com/projects/${projectId}/overview`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSuccess(`Radar executive alert successfully sent to ${recipientEmail} via SMTP.`);
      } else {
        setEmailError(data.error || 'Failed to dispatch email.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Network error dispatching alert.');
    } finally {
      setIsSendingEmail(false);
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
          <button
            type="button"
            onClick={() => setEmailModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-surface-feed hover:bg-card border border-border text-xs font-bold text-foreground transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Dispatch executive radar brief via SMTP email"
          >
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span>Email Brief</span>
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
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Predicted Horizon</p>
          <p className="font-mono text-base font-bold leading-tight text-primary mt-1">
            {isLoading ? '—' : horizon}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">Next Milestone</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Dominant DNA</p>
          <p className="font-mono text-sm font-bold text-foreground truncate mt-1">
            {isLoading ? '—' : dnaArchetype || 'Balanced'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">8-dimension profile</p>
        </div>
      </div>

      {/* Forecast Radar Snapshot */}
      <div className={`p-5 rounded-2xl bg-card border border-border space-y-4 ${cardShadow}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Forecasted Next Failure & Causal Reasoning
            </h2>
          </div>
          <Link
            href={`/projects/${projectId}/radar`}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <span>Full Radar</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-surface-feed border border-border space-y-2">
          <span className="text-[10px] font-mono font-bold text-destructive uppercase tracking-wider">
            POTENTIAL NEXT FAILURE
          </span>
          <p className="text-base font-bold text-foreground">
            {predictedFailure}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {recommendedMove}
          </p>
        </div>
      </div>

      {/* Active Operational Signals */}
      <div className={`p-5 rounded-2xl bg-card border border-border space-y-4 ${cardShadow}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
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

      {/* Email Dispatch Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Dispatch Radar Alert via SMTP</h3>
                  <p className="text-xs text-muted-foreground">From: contact@shyxon.com (smtp.nexudo.email:465)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmailModalOpen(false);
                  setEmailSuccess(null);
                  setEmailError(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailAlert} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="executive@company.com"
                  className="w-full bg-surface-feed border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-feed border border-border text-xs space-y-1">
                <span className="text-muted-foreground font-mono uppercase text-[10px] block font-bold">Email Payload Preview</span>
                <p className="font-semibold text-foreground">
                  [CRITICAL ALERT] FailureOps X Radar: {project.name || projectId}
                </p>
                <p className="text-muted-foreground line-clamp-2 italic">
                  Forecasted obstacle: {predictedFailure} (Risk: {project.failureRisk ?? project.failure_risk ?? 68}%)
                </p>
              </div>

              {emailSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              )}

              {emailError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Alert Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
