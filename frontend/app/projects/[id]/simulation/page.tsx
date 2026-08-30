'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  ActionEmpty,
  ActionError,
  ActionLoading,
  ActionPageHeader,
  InsightCard,
  KpiTile,
  asPercent,
  cardShadow,
  insightGridClass,
  kpiGridClass,
} from '@/components/causal/ActionChrome';

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
      if (updated) setSimulationData(updated);
    } catch (err: any) {
      console.error('Simulation execution error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const scenarios = simulationData?.scenarios || [];
  const baselineRisk = simulationData?.current_baseline_risk ?? 0;
  const activeScenario = scenarios.find((s: any) => s.scenario_id === selectedScenarioId) || scenarios[0];
  const recommended = scenarios.find((s: any) => s.scenario_id === simulationData?.recommended_scenario) || scenarios[0];
  const worst = scenarios.reduce((acc: any, s: any) => {
    if (!acc) return s;
    return s.simulated_risk > acc.simulated_risk ? s : acc;
  }, null);

  return (
    <div className="space-y-5">
      <ActionPageHeader
        eyebrow="DETERMINISTIC PROPAGATION"
        title="What-If Simulation"
        description="Compare freeze, experiment, and do-nothing paths on the same causal graph."
        action={{
          label: isSimulating ? 'Running…' : 'Run selected',
          icon: <Play className="h-3.5 w-3.5" aria-hidden="true" />,
          disabled: isSimulating || !activeScenario,
          onClick: () => activeScenario && handleRunSimulation(activeScenario.scenario_id),
        }}
      />

      {isLoading ? (
        <ActionLoading label="Computing deterministic What-If scenario propagation..." />
      ) : error ? (
        <ActionError title="Unable to Load What-If Simulation" message={error} onRetry={fetchSimulation} />
      ) : scenarios.length === 0 || !activeScenario ? (
        <ActionEmpty
          icon={Sparkles}
          title="No Simulation Scenarios Available Yet"
          description="Upload project evidence and run the analysis pipeline to generate deterministic risk simulations for this project."
          actionLabel="Run Project Analysis"
          actionHref={`/projects/${projectId}/analysis`}
        />
      ) : (
        <>
          <div className={kpiGridClass}>
            <KpiTile label="Baseline risk" value={`${baselineRisk}%`} caption="Do nothing" tone="destructive" />
            <KpiTile
              label="Recommended"
              value={recommended?.scenario_name || '—'}
              caption={
                recommended?.risk_change != null
                  ? `${recommended.risk_change > 0 ? '+' : ''}${recommended.risk_change}pp`
                  : '—'
              }
              tone="success"
              wrap
            />
            <KpiTile
              label="Worst case"
              value={worst?.scenario_name || '—'}
              caption={
                worst?.risk_change != null ? `${worst.risk_change > 0 ? '+' : ''}${worst.risk_change}pp` : '—'
              }
              tone="warning"
              wrap
            />
            <KpiTile label="Compute" value="Deterministic" caption="No LLM drift" tone="info" wrap />
          </div>

          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Available Simulation Scenarios
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="listbox" aria-label="Simulation scenarios">
              {scenarios.map((s: any) => {
                const isSelected = s.scenario_id === activeScenario.scenario_id;
                const isRecommended = s.scenario_id === simulationData?.recommended_scenario;
                return (
                  <button
                    key={s.scenario_id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedScenarioId(s.scenario_id)}
                    className={cn(
                      'flex min-h-11 cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-primary bg-primary-muted ring-1 ring-primary'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-card-hover',
                    )}
                  >
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
                          {String(s.scenario_id).replace(/_/g, ' ')}
                        </span>
                        {isRecommended && (
                          <span className="rounded bg-primary px-2 py-0.5 font-mono text-[9px] font-bold text-primary-foreground">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{s.scenario_name}</h4>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 font-mono text-xs">
                      <span className="text-[10px] text-muted-foreground">Projected Risk:</span>
                      <span
                        className={cn(
                          'font-bold',
                          s.simulated_risk < baselineRisk ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {s.simulated_risk}% ({s.risk_change > 0 ? `+${s.risk_change}` : s.risk_change} pts)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={insightGridClass}>
            <InsightCard title="Selected scenario">
              {activeScenario.explanation ||
                `${activeScenario.scenario_name}. Predicted risk ${activeScenario.simulated_risk}%. Confidence ${asPercent(activeScenario.confidence)}%.`}
            </InsightCard>
            <InsightCard title="Guardrail">
              {simulationData?.caveat_notice ||
                'This is a deterministic scenario simulation based on empirical signal propagation, not a guaranteed outcome.'}
            </InsightCard>
          </div>

          {activeScenario.propagation_steps?.length > 0 && (
            <div className={cn('space-y-3 rounded-[14px] border border-border bg-card p-4 sm:p-[18px]', cardShadow)}>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Simulated Signal Propagation Trajectory
              </h3>
              <ol className="space-y-2">
                {activeScenario.propagation_steps.map((step: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-feed/60 p-3.5 text-xs"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/20 font-mono text-[10px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-foreground">{step}</span>
                  </li>
                ))}
              </ol>
              {activeScenario.affected_dimensions?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="font-mono text-xs text-muted-foreground">Affected dimensions:</span>
                  {activeScenario.affected_dimensions.map((dim: string) => (
                    <span
                      key={dim}
                      className="rounded-full border border-border bg-surface-feed px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground"
                    >
                      {dim}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
