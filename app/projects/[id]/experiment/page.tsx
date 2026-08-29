'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FlaskConical, Play } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ExperimentWidget } from '@/components/intervention/ExperimentWidget';
import {
  ActionEmpty,
  ActionError,
  ActionLoading,
  ActionPageHeader,
  InsightCard,
  KpiTile,
  insightGridClass,
  kpiGridClass,
} from '@/components/causal/ActionChrome';

export default function ExperimentPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [experiments, setExperiments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startNonce, setStartNonce] = useState(0);

  const fetchExperiments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getExperiments(projectId);
      const list = res?.experiments || (Array.isArray(res) ? res : []);
      setExperiments(list);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve experiment registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [projectId]);

  const primary = experiments[0];
  const status = String(primary?.status || 'PLANNED').toUpperCase();
  const statusLabel =
    status === 'COMPLETED' ? 'Completed' : status === 'ACTIVE' || status === 'RUNNING' ? 'Running' : 'Planned';
  const durationDays = primary?.observation_period_days || primary?.duration_days;
  const baseline = primary?.baseline_metric ?? primary?.baselineMetric ?? primary?.target_metrics?.[0]?.baseline_value;
  const current = primary?.current_metric ?? primary?.currentMetric ?? primary?.progress_percent;
  const lift =
    typeof current === 'number' && typeof baseline === 'number' ? Math.round(current - baseline) : null;

  const runnable = experiments.find((e) => {
    const s = String(e.status || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'CANCELLED';
  });

  return (
    <div className="space-y-5">
      <ActionPageHeader
        eyebrow="COHORT DESIGN"
        title="Experiments"
        description="A/B the intervention with a holdout, then verify lift before writing memory."
        action={{
          label: 'Start cohort',
          icon: <Play className="h-3.5 w-3.5" aria-hidden="true" />,
          disabled: isLoading || (experiments.length > 0 && !runnable),
          onClick: () => setStartNonce((n) => n + 1),
          href: !isLoading && experiments.length === 0 ? `/projects/${projectId}/interventions` : undefined,
        }}
      />

      {isLoading ? (
        <ActionLoading label="Loading project experiments from backend..." />
      ) : error ? (
        <ActionError title="Unable to Load Experiments" message={error} onRetry={fetchExperiments} />
      ) : experiments.length === 0 ? (
        <ActionEmpty
          icon={FlaskConical}
          title="No Active Experiments Configured Yet"
          description="Run project analysis to identify failure patterns and synthesize evidence-backed interventions with testable experiment cohorts."
          actionLabel="Run Project Analysis"
          actionHref={`/projects/${projectId}/analysis`}
        />
      ) : (
        <>
          <div className={kpiGridClass}>
            <KpiTile
              label="Status"
              value={statusLabel}
              caption={durationDays ? `Day window ${durationDays}` : 'Cohort'}
              tone="info"
            />
            <KpiTile
              label="N"
              value={primary?.progress_percent != null ? `${primary.progress_percent}%` : '—'}
              caption="Observed progress"
              tone="foreground"
            />
            <KpiTile
              label="Interim lift"
              value={lift != null ? `${lift > 0 ? '+' : ''}${lift}pp` : '—'}
              caption="Not yet gated"
              tone="success"
            />
            <KpiTile
              label="Stop rule"
              value={primary?.success_criteria?.[0] || 'p<0.05'}
              caption="Pre-registered"
              tone="magic"
              wrap
            />
          </div>

          <div className={insightGridClass}>
            <InsightCard title="Treatment">
              {primary?.treatment_group ||
                primary?.treatmentGroup ||
                primary?.hypothesis ||
                'Active intervention protocol.'}
            </InsightCard>
            <InsightCard title="Holdout">
              {primary?.control_group ||
                primary?.controlGroup ||
                'Current baseline without intervention. No ungrounded price changes in either arm.'}
            </InsightCard>
          </div>

          <div className="space-y-4">
            {experiments.map((exp: any, idx: number) => (
              <ExperimentWidget
                key={exp.id || exp.experiment_id}
                experiment={exp}
                projectId={projectId}
                onRefresh={fetchExperiments}
                startNonce={idx === 0 ? startNonce : 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
