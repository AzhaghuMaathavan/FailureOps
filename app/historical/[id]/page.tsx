'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, History, Loader2 } from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import {
  OrgInsightCard,
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  orgPrimaryBtnClass,
  orgSecondaryBtnClass,
} from '@/components/layout/OrgShell';
import { apiClient } from '@/lib/api/client';
import { HistoricalCase } from '@/types';
import { useApp } from '@/context/AppContext';

function matchHistoricalCase(cases: any[], caseId: string) {
  const needle = caseId.toLowerCase();
  return cases.find(
    (c) =>
      c.id === caseId ||
      c.case_id === caseId ||
      String(c.id || '').toLowerCase().includes(needle) ||
      String(c.name || '').toLowerCase().includes(needle)
  );
}

function toHistoricalCase(found: any, caseId: string): HistoricalCase {
  return {
    id: found.id || found.case_id || caseId,
    name: found.name || found.project_name || 'Historical Case',
    companyAlias: found.companyAlias || found.company_alias || found.name,
    industry: found.industry || 'Enterprise',
    productDescription: found.productDescription || found.description || found.pattern || '',
    similarity: found.similarity || found.similarity_score || 0,
    outcome: found.outcome || found.historical_outcome || found.interventionOutcome || '',
    outcomeType: found.outcomeType || found.outcome_type || 'RECOVERED',
    primaryFailurePattern: found.primaryFailurePattern || found.dominant_archetype || found.failure || found.pattern || '',
    historicalIntervention: found.historicalIntervention || found.intervention || '',
    interventionOutcome: found.interventionOutcome || found.outcome || '',
    privacyLevel: found.privacyLevel || found.privacy_level || 'ANONYMOUS_LEARNING',
    timeline:
      found.timeline && found.timeline.length > 0
        ? found.timeline
        : [
            { step: 'Phase 1', description: found.failure || found.primaryFailurePattern || 'Failure pattern emerged', date: 'Month 1' },
            { step: 'Phase 2', description: found.intervention || found.historicalIntervention || 'Intervention deployed', date: 'Month 2' },
            { step: 'Phase 3', description: found.outcome || found.interventionOutcome || 'Outcome observed', date: 'Month 3' },
          ],
    keyLessons: found.keyLessons || found.key_lessons || found.lessons_learned || [
      'Validate onboarding friction before expanding mandatory setup gates.',
      'Quarantine compounding pipeline failures before they freeze release velocity.',
    ],
  };
}

function similarityDisplay(value: number): string {
  if (!value) return '—';
  return value > 1 ? (value / 100).toFixed(2) : Number(value).toFixed(2);
}

export default function HistoricalCaseDetailPage() {
  const params = useParams();
  const caseId = (params?.id as string) || 'atlas';
  const { project } = useApp();
  const [cases, setCases] = useState<HistoricalCase[]>([]);
  const [histCase, setHistCase] = useState<HistoricalCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAtlas = caseId.toLowerCase() === 'atlas';

  useEffect(() => {
    let mounted = true;

    const extractCases = (res: any) =>
      res?.cases || res?.matched_cases || res?.similar_cases || (Array.isArray(res) ? res : []);

    const load = async () => {
      try {
        const primary = await apiClient.getHistoricalCases(project.id);
        let raw = extractCases(primary);
        if ((!raw || raw.length === 0) && project.id !== 'aurora') {
          const fallback = await apiClient.getHistoricalCases('aurora');
          raw = extractCases(fallback);
        }
        const mapped: HistoricalCase[] = (raw || []).map((item: any, index: number) =>
          toHistoricalCase(item, item.id || item.case_id || `case-${index}`)
        );
        const found = matchHistoricalCase(raw || [], caseId);
        if (mounted) {
          setCases(mapped);
          setHistCase(found ? toHistoricalCase(found, caseId) : null);
          setIsLoading(false);
        }
      } catch {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [caseId, project.id]);

  const recovered = [...cases].filter((c) => c.outcomeType === 'RECOVERED').sort((a, b) => b.similarity - a.similarity);
  const failed = [...cases].filter((c) => c.outcomeType === 'FAILED').sort((a, b) => b.similarity - a.similarity);
  const bestTwin = recovered[0] || [...cases].sort((a, b) => b.similarity - a.similarity)[0];
  const worstTwin = failed[0] || [...cases].sort((a, b) => a.similarity - b.similarity)[0];
  const focusCase = isAtlas ? bestTwin : histCase;
  const similaritySource = focusCase || bestTwin;

  return (
    <OrgShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isAtlas ? '/search' : '/historical/atlas'}
          className="inline-flex min-h-11 items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isAtlas ? 'Back to global search' : 'Back to case atlas'}</span>
        </Link>
        {focusCase && (
          <div className="flex items-center gap-2">
            <PrivacyBadge level={focusCase.privacyLevel} />
            <span className="rounded-full border border-magic/30 bg-magic/10 px-2.5 py-0.5 font-mono text-xs font-bold text-magic">
              {focusCase.similarity}% vector similarity
            </span>
          </div>
        )}
      </div>

      <OrgPageHeader
        eyebrow="Case atlas"
        title="Historical Cases"
        description="Twins of the current trajectory — what failed, what recovered, what to copy."
        action={
          bestTwin ? (
            <Link href={`/historical/${bestTwin.id}`} className={orgPrimaryBtnClass}>
              Open {bestTwin.id}
            </Link>
          ) : (
            <Link href="/search" className={orgSecondaryBtnClass}>
              Open search
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrgMetricCard
          label="Matches"
          value={isLoading ? '…' : String(cases.length)}
          hint="DNA near"
          valueClassName="text-info"
        />
        <OrgMetricCard
          label="Best twin"
          value={isLoading ? '…' : bestTwin?.id || '—'}
          hint={bestTwin ? `+${bestTwin.similarity}` : 'No recovery twin'}
          valueClassName="text-success text-[18px] sm:text-[22px]"
        />
        <OrgMetricCard
          label="Worst twin"
          value={isLoading ? '…' : worstTwin?.id || '—'}
          hint={worstTwin?.outcomeType === 'FAILED' ? 'Missed GA' : worstTwin ? 'Weaker twin' : 'No anti-pattern'}
          valueClassName="text-destructive text-[18px] sm:text-[22px]"
        />
        <OrgMetricCard
          label="Similarity"
          value={isLoading ? '…' : similarityDisplay(similaritySource?.similarity || 0)}
          hint={similaritySource?.industry || 'Adoption'}
          valueClassName="text-magic"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-[14px] border border-border bg-card p-16 font-mono text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <span>Retrieving historical failure and recovery telemetry...</span>
        </div>
      ) : !isAtlas && !histCase ? (
        <div className="space-y-3 rounded-[14px] border border-border bg-card p-12 text-center">
          <p className="text-base font-bold text-foreground">Historical case not found</p>
          <p className="text-xs text-muted-foreground">
            No historical benchmark case matched the identifier “{caseId}”. Search the atlas for a nearby twin.
          </p>
          <Link href="/search" className={orgPrimaryBtnClass}>
            Return to global search
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(isAtlas
              ? cases.slice(0, 2)
              : [histCase, worstTwin && worstTwin.id !== histCase?.id ? worstTwin : recovered[1] || cases.find((c) => c.id !== histCase?.id)].filter(
                  (item): item is HistoricalCase => Boolean(item)
                )
            ).map((item) => (
              <OrgInsightCard
                key={item.id}
                href={`/historical/${item.id}`}
                title={item.id}
                body={
                  item.productDescription ||
                  item.primaryFailurePattern ||
                  'Historical twin of the current trajectory.'
                }
              />
            ))}
          </div>

          {!isAtlas && histCase && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <History className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>
                    {histCase.companyAlias} • {histCase.industry}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {histCase.name}: historical failure & recovery
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{histCase.productDescription}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded-[14px] border border-destructive/30 bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
                  <span className="block font-mono text-xs font-bold uppercase tracking-wider text-destructive">
                    Primary failure pattern
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{histCase.primaryFailurePattern}</h3>
                  <p className="pt-1 text-xs leading-relaxed text-muted-foreground">{histCase.outcome}</p>
                </div>
                <div className="space-y-2 rounded-[14px] border border-success/30 bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
                  <span className="block font-mono text-xs font-bold uppercase tracking-wider text-success">
                    Historical intervention deployed
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {histCase.historicalIntervention || 'Verified recovery intervention'}
                  </h3>
                  <p className="pt-1 text-xs leading-relaxed text-success">{histCase.interventionOutcome}</p>
                </div>
              </div>

              <div className="space-y-4 rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Incident & recovery timeline
                </h3>
                <div className="space-y-3">
                  {histCase.timeline.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-4 rounded-xl border border-border/60 bg-surface-feed/70 p-3 text-xs">
                      <span className="shrink-0 rounded border border-border bg-card px-2 py-0.5 font-mono font-bold text-primary">
                        {t.step}
                      </span>
                      <div>
                        <span className="font-semibold text-foreground">{t.description}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{t.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-[14px] border border-magic/30 bg-magic/10 p-[18px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-magic">Institutional lessons learned</h3>
                <div className="space-y-2 text-xs text-foreground">
                  {histCase.keyLessons.map((lesson, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-magic" aria-hidden="true" />
                      <span className="leading-relaxed">{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {isAtlas && cases.length > 2 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {cases.slice(2).map((item) => (
                <OrgInsightCard
                  key={item.id}
                  href={`/historical/${item.id}`}
                  title={item.name}
                  body={item.primaryFailurePattern || item.productDescription}
                />
              ))}
            </div>
          )}
        </>
      )}
    </OrgShell>
  );
}
