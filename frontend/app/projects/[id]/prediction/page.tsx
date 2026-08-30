'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Compass, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import {
  ActionEmpty,
  ActionError,
  ActionLoading,
  ActionPageHeader,
  InsightCard,
  KpiTile,
  asPercent,
  insightGridClass,
  kpiGridClass,
} from '@/components/causal/ActionChrome';
import { EvidenceModal } from '@/components/evidence/EvidenceModal';

export default function PredictionPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [predictionData, setPredictionData] = useState<any>(null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setError(null);
    apiClient
      .getPredictions(projectId)
      .then((res) => {
        setPredictionData(res);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err?.message || 'Unable to retrieve prediction.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);
    apiClient
      .getPredictions(projectId)
      .then((res) => {
        if (mounted) {
          setPredictionData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message || 'Unable to retrieve prediction.');
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const pred = predictionData?.prediction || predictionData || null;
  const isAvailable =
    pred &&
    pred.predicted_failure &&
    pred.predicted_failure !== 'Insufficient Telemetry for Trajectory Modeling' &&
    pred.predicted_failure !== 'No Failure Predicted (Awaiting Analysis)' &&
    pred.status !== 'UNLIKELY';

  return (
    <div className="space-y-5">
      <ActionPageHeader
        eyebrow="TRAJECTORY FORECAST"
        title="Predicted next failure"
        description="Probabilistic milestone synthesized from velocity decay and historical twins."
        action={{
          label: 'Open What-If',
          href: `/projects/${projectId}/simulation`,
          icon: <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />,
        }}
      />

      {isLoading ? (
        <ActionLoading label="Retrieving probabilistic failure forecast..." />
      ) : error ? (
        <ActionError title="Unable to Load Prediction" message={error} onRetry={load} />
      ) : !isAvailable ? (
        <ActionEmpty
          icon={Compass}
          title="Insufficient evidence for a reliable failure prediction."
          description="Upload project evidence and run the continuous reasoning analysis pipeline to synthesize predictive failure milestones."
          actionLabel="Run Project Analysis"
          actionHref={`/projects/${projectId}/analysis`}
        />
      ) : (
        <>
          <div className={kpiGridClass}>
            <KpiTile
              label="Milestone"
              value={pred.predicted_failure}
              caption={pred.status || 'Checkout GA'}
              tone="destructive"
              wrap
            />
            <KpiTile
              label="Window"
              value={pred.time_horizon || 'Unknown'}
              caption={`${asPercent(pred.confidence)}% CI`}
              tone="warning"
            />
            <KpiTile label="Probability" value={`${asPercent(pred.confidence)}%`} caption="Posterior" tone="magic" />
            <KpiTile
              label="Reversible"
              value={pred.status === 'MITIGATED' ? 'Partial' : 'Yes'}
              caption="If experiment ships"
              tone="success"
            />
          </div>

          <div className={insightGridClass}>
            <InsightCard title="Why this path">
              {pred.explanation || 'Insufficient evidence for a failure prediction.'}
            </InsightCard>
            <InsightCard title="If ignored">
              Support reopen compounds, GA slips, and memory records a preventable miss unless the{' '}
              {pred.time_horizon || 'forecast'} window is interrupted.
            </InsightCard>
          </div>

          {pred.supporting_evidence_ids?.length > 0 && (
            <InsightCard title="Supporting evidence">
              <div className="flex flex-wrap gap-2">
                {pred.supporting_evidence_ids.map((evId: string) => (
                  <button
                    key={evId}
                    type="button"
                    onClick={() => setActiveEvidenceId(evId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    title={`Inspect evidence citation #${evId}`}
                  >
                    <span>#{evId}</span>
                  </button>
                ))}
              </div>
            </InsightCard>
          )}

          <Link
            href={`/projects/${projectId}/simulation`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[12px] bg-primary px-4 py-3 text-[14px] font-bold text-primary-foreground shadow-[0_0_20px_-4px_rgba(255,122,0,0.4)] sm:hidden"
          >
            Open next step
          </Link>

          {/* Evidence Citation Modal */}
          <EvidenceModal
            evidenceId={activeEvidenceId}
            projectId={projectId}
            onClose={() => setActiveEvidenceId(null)}
          />
        </>
      )}
    </div>
  );
}
