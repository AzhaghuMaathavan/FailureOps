'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Sparkles,
  Play,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  Info,
  Loader2,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function WhatIfSimulationPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';

  const [simulationData, setSimulationData] = useState<any>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getSimulation(projectId);
      setSimulationData(res);
      if (res?.scenarios && res.scenarios.length > 0) {
        setSelectedScenarioId(res.recommended_scenario || res.scenarios[0].scenario_id);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load What-If simulation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation();
  }, [projectId]);

  const handleRunSimulation = async (scenarioId: string) => {
    try {
      setIsSimulating(true);
      const updated = await apiClient.runSimulation(projectId, scenarioId);
      if (updated) {
        setSimulationData(updated);
      }
    } catch (err: any) {
      console.error('Simulation execution error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 rounded-2xl bg-card border border-border flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span>Computing deterministic What-If scenario propagation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        <p className="font-bold">Unable to Load What-If Simulation</p>
        <p className="text-xs mt-1 text-rose-400">{error}</p>
        <button
          onClick={fetchSimulation}
          className="mt-3 px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-mono text-rose-200 border border-rose-500/40 cursor-pointer"
        >
          Retry Simulation
        </button>
      </div>
    );
  }

  const scenarios = simulationData?.scenarios || [];
  const baselineRisk = simulationData?.current_baseline_risk ?? 0;
  const activeScenario = scenarios.find((s: any) => s.scenario_id === selectedScenarioId) || scenarios[0];

  if (scenarios.length === 0 || !activeScenario) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              What-If Scenario Simulation
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Deterministic operational scenario modeling based on empirical signal propagation.
            </p>
          </div>
        </div>

        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
          <p className="text-base font-bold text-foreground">No Simulation Scenarios Available Yet</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Upload project evidence and run the analysis pipeline to generate deterministic risk simulations for this project.
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Deterministic Simulation Engine
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Signal Propagation Model
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            What-If Scenario Simulation
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Model the systemic downstream risk impact of operational decisions before committing engineering resources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRunSimulation(activeScenario.scenario_id)}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold font-mono transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>Re-Simulate</span>
          </button>
        </div>
      </div>

      {/* Baseline vs Simulated Risk Comparison Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Baseline Risk */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm">
          <span className="text-xs font-mono text-muted-foreground uppercase font-bold block">
            Current Baseline Risk
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-foreground">
              {baselineRisk}%
            </span>
            <span className="text-xs font-mono text-muted-foreground">Unmitigated</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Weighted across detected Failure DNA vectors.
          </p>
        </div>

        {/* Projected Risk */}
        <div className="p-6 rounded-2xl bg-card border border-primary/40 shadow-sm">
          <span className="text-xs font-mono text-primary uppercase font-bold block">
            Projected Simulated Risk
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono ${
                activeScenario.simulated_risk < baselineRisk
                  ? 'text-emerald-400'
                  : activeScenario.simulated_risk > baselineRisk
                  ? 'text-rose-400'
                  : 'text-foreground'
              }`}
            >
              {activeScenario.simulated_risk}%
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                activeScenario.risk_change < 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : activeScenario.risk_change > 0
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-surface-feed text-muted-foreground'
              }`}
            >
              {activeScenario.risk_change > 0 ? `+${activeScenario.risk_change}` : activeScenario.risk_change} pts
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Under scenario: {activeScenario.scenario_name}
          </p>
        </div>

        {/* Simulation Confidence */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm">
          <span className="text-xs font-mono text-purple-400 uppercase font-bold block">
            Model Confidence
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-purple-400">
              {Math.round(
                (typeof activeScenario.confidence === 'number' ? activeScenario.confidence : 0) *
                  ((typeof activeScenario.confidence === 'number' && activeScenario.confidence <= 1) ? 100 : 1)
              )}%
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {typeof activeScenario.confidence === 'number' ? 'From simulation engine' : 'Unverified'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Calibrated against historical empirical outcomes.
          </p>
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
          Available Simulation Scenarios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenarios.map((s: any) => {
            const isSelected = s.scenario_id === activeScenario.scenario_id;
            const isRecommended = s.scenario_id === simulationData?.recommended_scenario;

            return (
              <button
                key={s.scenario_id}
                onClick={() => setSelectedScenarioId(s.scenario_id)}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_-3px_rgba(255,122,0,0.35)] ring-1 ring-primary/50'
                    : 'bg-card border-border/80 hover:border-border hover:bg-card-hover'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-1 mb-1">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                      {s.scenario_id.replace(/_/g, ' ')}
                    </span>
                    {isRecommended && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-primary text-white">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground">{s.scenario_name}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground text-[10px]">Projected Risk:</span>
                  <span
                    className={`font-bold ${
                      s.simulated_risk < baselineRisk ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {s.simulated_risk}% ({s.risk_change > 0 ? `+${s.risk_change}` : s.risk_change} pts)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Scenario Deep Inspection */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <span className="text-xs font-mono uppercase text-primary font-bold">
              Scenario Analysis
            </span>
            <h2 className="text-xl font-bold text-foreground mt-0.5">{activeScenario.scenario_name}</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Affected Dimensions:</span>
            {activeScenario.affected_dimensions?.map((dim: string) => (
              <span
                key={dim}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-surface-feed border border-border font-semibold text-foreground"
              >
                {dim}
              </span>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="p-4 rounded-xl bg-surface-feed/70 border border-border/70 text-xs text-foreground leading-relaxed">
          <span className="text-[10px] font-mono font-bold uppercase text-primary block mb-1">
            Engine Rationale
          </span>
          <p className="font-medium">{activeScenario.explanation}</p>
        </div>

        {/* Causal Propagation Steps */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Simulated Signal Propagation Trajectory
          </h3>
          <div className="space-y-2">
            {activeScenario.propagation_steps?.map((step: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-feed/60 border border-border/60 text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-foreground font-medium">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Epistemic Caveat Notice */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 leading-relaxed flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-amber-200">Caveat: </span>
            {simulationData?.caveat_notice ||
              'This is a deterministic scenario simulation based on empirical signal propagation, not a guaranteed outcome.'}
          </p>
        </div>
      </div>
    </div>
  );
}
