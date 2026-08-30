'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, Play, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { actionPrimaryBtnClass, cardShadow } from '@/components/causal/ActionChrome';

interface ExperimentWidgetProps {
  experiment: any;
  onRunExperiment?: () => void;
  onRefresh?: () => void;
  projectId?: string;
  startNonce?: number;
}

export const ExperimentWidget: React.FC<ExperimentWidgetProps> = ({
  experiment,
  onRefresh,
  projectId = 'aurora',
  startNonce = 0,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const lastStartNonce = useRef(0);
  const baseline = experiment.baseline_metric ?? experiment.baselineMetric ?? experiment.target_metrics?.[0]?.baseline_value ?? 30;
  const current = experiment.current_metric ?? experiment.currentMetric ?? experiment.progress_percent ?? baseline;
  const [currentMetric, setCurrentMetric] = useState(current);
  const status = String(experiment.status || '').toUpperCase();
  const isCompleted = status === 'COMPLETED';

  const expId = experiment.id || experiment.experiment_id || 'exp_01';
  const duration = experiment.observation_period_days
    ? `${experiment.observation_period_days} Days`
    : experiment.duration_days
      ? `${experiment.duration_days} Days`
      : experiment.duration || '14 Days';
  const hypothesis = experiment.hypothesis || 'Targeted intervention will relieve operational drag and improve conversion.';
  const control = experiment.control_group || experiment.controlGroup || 'Current baseline without intervention';
  const treatment = experiment.treatment_group || experiment.treatmentGroup || 'Active intervention protocol';
  const targetMetricText = experiment.success_metric || experiment.successMetric || experiment.success_criteria?.[0] || 'Measurable metric improvement';

  const handleStart = async () => {
    setIsRunning(true);
    try {
      await apiClient.startExperiment(projectId, expId).catch(() => {});
      const target = Math.min(100, Math.round(Number(baseline) * 1.6) || 80);
      let val = Number(baseline) || 0;
      const interval = setInterval(() => {
        val += 3;
        if (val >= target) {
          val = target;
          clearInterval(interval);
          setIsRunning(false);
          apiClient
            .verifyExperiment(projectId, expId, {
              observed_metrics: { measured_metric: val },
            })
            .then(() => {
              if (onRefresh) onRefresh();
            })
            .catch(() => {});
        }
        setCurrentMetric(val);
      }, 100);
    } catch {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (startNonce && startNonce !== lastStartNonce.current && !isCompleted && !isRunning) {
      lastStartNonce.current = startNonce;
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNonce]);

  const statusLabel = isCompleted ? 'Completed' : isRunning || status === 'ACTIVE' || status === 'RUNNING' ? 'Running' : 'Planned';

  return (
    <div className={cn('space-y-5 rounded-[14px] border border-border bg-card p-4 sm:p-[18px]', cardShadow)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              {experiment.title || 'Active Validation Experiment'}
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              {expId} • {duration}
            </span>
          </div>
        </div>

        <span
          className={cn(
            'rounded-full border px-3 py-1 font-mono text-xs font-semibold uppercase',
            isCompleted
              ? 'border-success/30 bg-success/10 text-success'
              : isRunning
                ? 'animate-pulse border-primary/30 bg-primary/10 text-primary motion-reduce:animate-none'
                : 'border-border bg-surface-feed text-muted-foreground',
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="rounded-xl border border-border/70 bg-surface-feed/70 p-4">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Falsifiable Hypothesis
        </span>
        <p className="text-sm font-semibold italic leading-relaxed text-foreground">&ldquo;{hypothesis}&rdquo;</p>
      </div>

      <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase text-muted-foreground">
            Control Cohort (A)
          </span>
          <p className="font-medium leading-relaxed text-foreground">{control}</p>
          <div className="mt-3 flex justify-between border-t border-border/50 pt-2 font-mono">
            <span className="text-muted-foreground">Baseline Metric:</span>
            <span className="font-bold text-foreground">{baseline}%</span>
          </div>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase text-primary">
            Treatment Cohort (B)
          </span>
          <p className="font-medium leading-relaxed text-foreground">{treatment}</p>
          <div className="mt-3 flex justify-between border-t border-primary/20 pt-2 font-mono">
            <span className="text-muted-foreground">Target Metric:</span>
            <span className="font-bold text-primary">{targetMetricText}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-surface-feed/60 p-5">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-muted-foreground">Observed Cohort Telemetry:</span>
          <span className="text-lg font-bold text-foreground">{currentMetric}%</span>
        </div>

        <div
          className="relative h-3 w-full overflow-hidden rounded-full bg-border/50"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.max(0, Number(currentMetric) || 0))}
          aria-label="Observed cohort telemetry"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-warning to-success transition-all duration-300 motion-reduce:transition-none"
            style={{ width: `${Math.min(100, Math.max(5, Number(currentMetric) || 0))}%` }}
          />
        </div>

        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>Baseline ({baseline}%)</span>
          <span>Treatment Result ({currentMetric}%)</span>
        </div>
      </div>

      {!isCompleted && (
        <button type="button" onClick={handleStart} disabled={isRunning} className={cn(actionPrimaryBtnClass, 'w-full')}>
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span>Simulating A/B Test Cohort Telemetry...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Launch Experiment Verification</span>
            </>
          )}
        </button>
      )}

      {isCompleted && (
        <div className="space-y-2 rounded-xl border border-success/30 bg-success/10 p-4 text-xs text-success">
          <div className="flex items-center gap-2 text-sm font-bold text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span>Experiment outcome verified</span>
          </div>
          <p className="leading-relaxed text-foreground">
            {experiment.observed_outcome ||
              experiment.observedOutcome ||
              'Metric improvement empirically validated against baseline.'}
          </p>
          {(experiment.ai_interpretation || experiment.aiInterpretation) && (
            <p className="border-t border-success/20 pt-2 font-mono text-[11px] text-muted-foreground">
              {experiment.ai_interpretation || experiment.aiInterpretation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
