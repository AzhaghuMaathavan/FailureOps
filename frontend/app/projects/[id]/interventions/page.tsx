'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Calculator, CheckCircle2, Circle, FlaskConical, Loader2, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  ActionEmpty,
  ActionError,
  ActionLoading,
  ActionPageHeader,
  InsightCard,
  KpiTile,
  cardShadow,
  insightGridClass,
  kpiGridClass,
} from '@/components/causal/ActionChrome';

export default function InterventionsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id as string) || 'aurora';
  const [interventions, setInterventions] = useState<any[]>([]);
  const [selectedBreakdown, setSelectedBreakdown] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getInterventions(projectId);
      const items = res?.interventions || (Array.isArray(res) ? res : []);
      setInterventions(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load intervention plan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (interventionId: string) => {
    try {
      setPromotingId(interventionId);
      await apiClient.promoteIntervention(projectId, interventionId);
      router.push(`/projects/${projectId}/experiment`);
    } catch (err: any) {
      setError(err?.message || 'Failed to promote intervention to experiment.');
    } finally {
      setPromotingId(null);
    }
  };

  const handleToggleActionItem = async (interventionId: string, itemId: string) => {
    try {
      setInterventions((prev) =>
        prev.map((item) => {
          if (item.intervention_id !== interventionId && item.id !== interventionId) return item;
          const completed = item.completed_action_items || [];
          const updated = completed.includes(itemId)
            ? completed.filter((id: string) => id !== itemId)
            : [...completed, itemId];
          return { ...item, completed_action_items: updated };
        })
      );
      await apiClient.toggleActionItem(projectId, interventionId, itemId);
    } catch (err: any) {
      console.error('Failed to toggle action item:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (!selectedBreakdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBreakdown(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedBreakdown]);

  const primary = interventions[0];
  const bestLift = interventions.reduce((max, item) => Math.max(max, item.expected_risk_reduction || 0), 0);
  const conflict = interventions.find(
    (item) => String(item.priority || '').toUpperCase() === 'LOW' || String(item.effort || '').toUpperCase() === 'HIGH',
  );
  const lowEffort = interventions.find((item) => String(item.effort || '').toUpperCase() === 'LOW');

  return (
    <div className="space-y-5">
      <ActionPageHeader
        eyebrow="EVIDENCE-BACKED PLAYBOOKS"
        title="Interventions"
        description="Moves ranked by empirical success in similar Failure DNA neighborhoods."
        action={{
          label: promotingId ? 'Promoting…' : 'Promote primary',
          disabled: !primary || Boolean(promotingId),
          onClick: () => primary && handlePromote(primary.intervention_id || primary.id),
          icon: promotingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />,
        }}
      />

      {loading ? (
        <ActionLoading label="Calculating prioritized interventions and mitigation playbooks..." />
      ) : error ? (
        <ActionError title="Failed to load interventions" message={error} onRetry={loadData} />
      ) : interventions.length === 0 ? (
        <ActionEmpty
          title="No interventions generated yet"
          description="Run project analysis to synthesize grounded recovery interventions."
          actionLabel="Run Project Analysis"
          actionHref={`/projects/${projectId}/analysis`}
        />
      ) : (
        <>
          <div className={kpiGridClass}>
            <KpiTile label="Ranked" value={interventions.length} caption="Playbooks" tone="info" />
            <KpiTile
              label="Best lift"
              value={bestLift ? `+${bestLift}pp` : '—'}
              caption={primary?.target_dimension || 'Onboarding'}
              tone="success"
            />
            <KpiTile
              label="Cost"
              value={lowEffort?.effort || primary?.effort || '—'}
              caption={lowEffort ? 'Lowest effort' : primary?.urgency?.replace(/_/g, ' ') || '3 days eng'}
              tone="primary"
            />
            <KpiTile
              label="Conflict"
              value={conflict?.title || 'None'}
              caption={conflict ? 'Review before run' : 'Clear to run'}
              tone="destructive"
              wrap
            />
          </div>

          <div className={insightGridClass}>
            <InsightCard title="Primary playbook">
              {primary
                ? `${primary.title}. ${primary.problem_addressed || primary.summary || ''} Expected −${primary.expected_risk_reduction || 0} pts.`
                : 'No primary playbook ranked yet.'}
            </InsightCard>
            <InsightCard title="Anti-pattern">
              {conflict
                ? `${conflict.title}. High effort or low priority — do not treat as the recovery lever.`
                : 'Discounting list price or ungrounded scope cuts should not be stored as recovery levers when adoption is the DNA.'}
            </InsightCard>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {interventions.map((item: any) => {
              const prioScore = item.priority_score ?? item.historicalEvidenceStrength ?? 80;
              const prioLvl = item.priority || 'HIGH';
              const title = item.title;
              const summary = item.problem_addressed || item.summary;
              const actions = item.action_steps || item.actionItems || [];
              const evidenceIds = item.evidence_ids || [];
              const breakdown = item.priority_breakdown;

              return (
                <article
                  key={item.intervention_id || item.id}
                  className={cn('flex flex-col justify-between rounded-[14px] border border-border bg-card p-4 sm:p-[18px]', cardShadow)}
                >
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                          Priority: {prioScore}/100 ({prioLvl})
                        </span>
                        <span className="rounded-full border border-border bg-surface-feed px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {item.target_dimension || 'Technical'}
                        </span>
                      </div>
                      {breakdown && (
                        <button
                          type="button"
                          onClick={() => setSelectedBreakdown(breakdown)}
                          className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-mono text-[11px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Formula</span>
                        </button>
                      )}
                    </div>

                    <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>

                    {actions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Action Plan (Interactive Steps)</h4>
                        <div className="space-y-1.5">
                          {actions.map((act: string, idx: number) => {
                            const itemId = `step_${idx}`;
                            const isDone = (item.completed_action_items || []).includes(itemId);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleToggleActionItem(item.intervention_id || item.id, itemId)}
                                className={cn(
                                  'flex w-full cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  isDone
                                    ? 'border-success/30 bg-success/10 text-foreground'
                                    : 'border-border/60 bg-surface-feed/70 text-foreground hover:bg-card',
                                )}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                                ) : (
                                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                                )}
                                <span className={isDone ? 'line-through text-muted-foreground' : ''}>{act}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {evidenceIds.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">Grounding:</span>
                        {evidenceIds.map((eid: string) => (
                          <Link
                            key={eid}
                            href={`/projects/${projectId}/evidence#${eid}`}
                            className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary hover:bg-primary/20 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                          >
                            #{eid}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <span className="font-mono text-xs font-semibold text-success">
                      Expected Reduction: −{item.expected_risk_reduction || 15} pts
                    </span>
                    <button
                      type="button"
                      disabled={promotingId === (item.intervention_id || item.id)}
                      onClick={() => handlePromote(item.intervention_id || item.id)}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      {promotingId === (item.intervention_id || item.id) ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Promoting…</span>
                        </>
                      ) : (
                        <>
                          <span>Promote & Launch</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {selectedBreakdown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setSelectedBreakdown(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="priority-formula-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 id="priority-formula-title" className="text-sm font-bold text-foreground">
                  Priority Calculation Breakdown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBreakdown(null)}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close formula"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between rounded-lg bg-surface-feed p-2">
                <span className="text-muted-foreground">Risk Severity:</span>
                <span className="font-bold text-foreground">{selectedBreakdown.risk_severity} / 100</span>
              </div>
              <div className="flex justify-between rounded-lg bg-surface-feed p-2">
                <span className="text-muted-foreground">Prediction Confidence:</span>
                <span className="font-bold text-foreground">{selectedBreakdown.prediction_confidence}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-surface-feed p-2">
                <span className="text-muted-foreground">Causal Chain Impact:</span>
                <span className="font-bold text-foreground">{selectedBreakdown.chain_impact}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-surface-feed p-2">
                <span className="text-muted-foreground">Expected Risk Reduction:</span>
                <span className="font-bold text-success">−{selectedBreakdown.expected_risk_reduction} pts</span>
              </div>
              <div className="flex justify-between rounded-lg bg-surface-feed p-2">
                <span className="text-muted-foreground">Effort Weight Divisor:</span>
                <span className="font-bold text-foreground">{selectedBreakdown.effort_weight}</span>
              </div>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 font-mono text-xs text-primary">
              <span className="mb-1 block font-bold">Mathematical Formula:</span>
              <span className="text-[11px] leading-relaxed">{selectedBreakdown.formula_explanation}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
