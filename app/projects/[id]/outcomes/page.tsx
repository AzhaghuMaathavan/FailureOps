'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Database, FileCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { SaveMemoryModal } from '@/components/memory/SaveMemoryModal';
import {
  ActionEmpty,
  ActionPageHeader,
  InsightCard,
  KpiTile,
  cardShadow,
  insightGridClass,
  kpiGridClass,
} from '@/components/causal/ActionChrome';
import { cn } from '@/lib/utils';

export default function OutcomeVerificationPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [outcomeData, setOutcomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOutcomes() {
      try {
        setLoading(true);
        const res = await apiClient.getOutcomes(projectId);
        if (res?.outcomes && res.outcomes.length > 0) {
          setOutcomeData(res);
        }
      } catch {
        // Fallback default
      } finally {
        setLoading(false);
      }
    }
    loadOutcomes();
  }, [projectId]);

  const outcomes = outcomeData?.outcomes || [];
  const primaryOutcome = outcomes[0];
  const improved = primaryOutcome?.metric_deltas?.find((d: any) => d.is_improved) || primaryOutcome?.metric_deltas?.[0];
  const lift = improved?.percent_improvement;
  const dnaShift = primaryOutcome?.metric_deltas?.[0];

  return (
    <div className="space-y-5">
      <ActionPageHeader
        eyebrow="VERIFIED LIFT"
        title="Outcome Verification"
        description="Did the intervention actually move the failure trajectory — not just a dashboard green?"
        action={{
          label: 'Write to memory',
          icon: <Database className="h-3.5 w-3.5" aria-hidden="true" />,
          disabled: !primaryOutcome,
          onClick: () => setIsModalOpen(true),
        }}
      />

      {loading ? (
        <div className={kpiGridClass} aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" />
          ))}
        </div>
      ) : !primaryOutcome ? (
        <ActionEmpty
          icon={FileCheck}
          title="No Verified Outcomes Recorded Yet"
          description="Run an intervention experiment to verify post-mitigation telemetry against baseline metrics with attribution confidence."
          actionLabel="Open Experiments"
          actionHref={`/projects/${projectId}/experiment`}
        />
      ) : (
        <>
          <div className={kpiGridClass}>
            <KpiTile
              label="Lift"
              value={typeof lift === 'number' ? `${lift > 0 ? '+' : ''}${Math.round(lift)}pp` : '—'}
              caption={
                improved
                  ? `${improved.metric_name?.replace(/_/g, ' ')} ${improved.baseline_value}→${improved.measured_after_value}`
                  : 'Risk delta'
              }
              tone="success"
            />
            <KpiTile
              label="Powered"
              value={primaryOutcome.attribution_confidence === 'HIGH' ? 'Yes' : primaryOutcome.attribution_confidence || '—'}
              caption={`N metrics ${primaryOutcome.metric_deltas?.length || 0}`}
              tone="info"
            />
            <KpiTile
              label="DNA shift"
              value={dnaShift ? dnaShift.metric_name?.replace(/_/g, ' ') : '—'}
              caption={dnaShift?.is_improved ? 'Dominant eased' : 'Unchanged'}
              tone="magic"
              wrap
            />
            <KpiTile
              label="Ready"
              value={primaryOutcome.status === 'SUCCESS' ? 'Commit' : primaryOutcome.status || '—'}
              caption="Institutional"
              tone="primary"
            />
          </div>

          <div className={insightGridClass}>
            <InsightCard title="What worked">
              {primaryOutcome.summary || 'No empirical outcome recorded yet for this project.'}
            </InsightCard>
            <InsightCard title="What did not">
              {primaryOutcome.epistemic_safety_note || primaryOutcome.attribution_reasoning ||
                'Pricing or ungrounded levers with no causal effect should not be stored as recovery memory.'}
            </InsightCard>
          </div>

          {primaryOutcome.metric_deltas?.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {primaryOutcome.metric_deltas.map((delta: any) => (
                <div
                  key={delta.metric_name}
                  className={cn('flex flex-col justify-between rounded-[14px] border border-border bg-card p-4 sm:p-[18px]', cardShadow)}
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-mono text-xs font-bold uppercase text-muted-foreground">
                      {delta.metric_name.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 font-mono text-[10px] font-bold',
                        delta.is_improved ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {delta.is_improved ? 'IMPROVED' : 'REGRESSED'}
                    </span>
                  </div>
                  <div className="my-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="block font-mono text-[10px] text-muted-foreground">BASELINE</span>
                      <span className="font-mono text-2xl font-bold text-destructive">
                        {delta.baseline_value}
                        {delta.unit === 'percent' ? '%' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[10px] text-muted-foreground">MEASURED</span>
                      <span className="font-mono text-2xl font-bold text-success">
                        {delta.measured_after_value}
                        {delta.unit === 'percent' ? '%' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[10px] font-bold text-primary">DELTA</span>
                      <span className="font-mono text-2xl font-bold text-primary">
                        {delta.percent_improvement > 0 ? '+' : ''}
                        {delta.percent_improvement}%
                      </span>
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Polarity:{' '}
                    {delta.polarity === 'POSITIVE_WHEN_DECREASING'
                      ? 'Lower is Better (Mitigated)'
                      : 'Higher is Better (Growth)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <SaveMemoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} outcome={primaryOutcome} />
    </div>
  );
}
