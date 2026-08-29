'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Compass, AlertOctagon, Lightbulb, ArrowRight, ShieldCheck, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function PredictionPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [predictionData, setPredictionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    apiClient.getPredictions(projectId)
      .then(res => {
        if (mounted) {
          setPredictionData(res);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err?.message || 'Unable to retrieve prediction.');
          setIsLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [projectId]);

  const pred = predictionData?.prediction || predictionData || null;
  const isAvailable = pred && pred.predicted_failure && pred.predicted_failure !== 'Insufficient Telemetry for Trajectory Modeling' && pred.predicted_failure !== 'No Failure Predicted (Awaiting Analysis)' && pred.status !== 'UNLIKELY';

  if (isLoading) {
    return (
      <div className="p-16 rounded-2xl bg-card border border-border flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span>Retrieving probabilistic failure forecast from backend...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm" role="alert">
        <p className="font-bold">Unable to Load Prediction</p>
        <p className="text-xs mt-1 text-rose-400">{error}</p>
        <button
          onClick={() => {
            setIsLoading(true);
            setError(null);
            apiClient.getPredictions(projectId)
              .then((res) => setPredictionData(res))
              .catch((err) => setError(err?.message || 'Unable to retrieve prediction.'))
              .finally(() => setIsLoading(false));
          }}
          className="mt-3 px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-mono text-rose-200 border border-rose-500/40 cursor-pointer"
        >
          Retry Prediction
        </button>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              Predicted Next Failure Milestone
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Probabilistic trajectory forecast synthesized from cross-source velocity decay and historical case matching.
            </p>
          </div>
        </div>

        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <Compass className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
          <p className="text-base font-bold text-foreground">Insufficient evidence for a reliable failure prediction.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Upload project evidence and run the continuous reasoning analysis pipeline to synthesize predictive failure milestones.
          </p>
          <Link
            href={`/projects/${projectId}/analysis`}
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
          >
            Run Project Analysis
          </Link>
        </div>
      </div>
    );
  }

  const predictedFailureTitle = pred.predicted_failure;
  const riskScore = pred.risk_score ?? 0;
  const confidenceRaw = typeof pred.confidence === 'number' ? pred.confidence : 0;
  const confidence = Math.round(confidenceRaw * (confidenceRaw <= 1 ? 100 : 1));
  const timeHorizon = pred.time_horizon || 'Unknown horizon';
  const explanation = pred.explanation || 'Insufficient evidence for a failure prediction.';
  const supportingEv = pred.supporting_evidence_ids || [];

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
              Status: {pred.status || 'INSUFFICIENT'}
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
                Most Probable Failure Horizon ({timeHorizon})
              </span>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {predictedFailureTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase block">Risk Score</span>
              <span className="text-2xl font-extrabold text-rose-400">{riskScore}%</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase block">Confidence</span>
              <span className="text-2xl font-extrabold text-primary">{confidence}%</span>
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

        {/* Grounded Explanation from Backend */}
        <div className="p-5 rounded-2xl bg-surface-feed/70 border border-border/70 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono block">
            Engine Rationale & Causal Mechanics
          </span>
          <p className="text-xs text-foreground leading-relaxed font-medium">
            {explanation}
          </p>
        </div>

        {/* Supporting Evidence Citations */}
        {supportingEv.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono block">
              Supporting Evidence Citations ({supportingEv.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {supportingEv.map((evId: string) => (
                <span
                  key={evId}
                  className="px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-mono text-foreground font-semibold"
                >
                  {evId}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA Banner */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            Targeted interventions can decelerate risk progression before the {timeHorizon} horizon.
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
