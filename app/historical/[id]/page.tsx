'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Database, ArrowLeft, History, CheckCircle2, ShieldAlert, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { apiClient } from '@/lib/api/client';
import { HistoricalCase } from '@/types';

export default function HistoricalCaseDetailPage() {
  const params = useParams();
  const caseId = (params?.id as string) || 'atlas';
  const [histCase, setHistCase] = useState<HistoricalCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient.getHistoricalCases(caseId)
      .then((res: any) => {
        if (mounted) {
          const cases = res?.cases || res?.similar_cases || (Array.isArray(res) ? res : []);
          const found = cases.find((c: any) => c.id === caseId || c.case_id === caseId) || cases[0];
          if (found) {
            setHistCase({
              id: found.id || found.case_id || caseId,
              name: found.name || found.project_name || 'Project Atlas',
              companyAlias: found.companyAlias || found.company_alias || 'FinTech Growth Co',
              industry: found.industry || 'FinTech / Payments',
              productDescription: found.productDescription || found.description || 'Cloud expense & corporate card platform.',
              similarity: found.similarity || found.similarity_score || 89,
              outcome: found.outcome || found.historical_outcome || 'Delayed Beta & $450k engineering overtime burnout before recovery.',
              outcomeType: found.outcomeType || 'RECOVERED',
              primaryFailurePattern: found.primaryFailurePattern || found.dominant_archetype || 'Scope Creep & CI Pipeline Paralysis',
              historicalIntervention: found.historicalIntervention || 'Quarantined integration test suite and simplified compliance onboarding.',
              interventionOutcome: found.interventionOutcome || 'Activation jumped to 64% and test failure rate dropped to 12%.',
              privacyLevel: found.privacyLevel || found.privacy_level || 'SHARED_ANONYMIZED',
              timeline: found.timeline || [
                { step: 'Phase 1', description: 'Monolithic decomposition introduced 28.6% CI failure rate', date: 'Month 1' },
                { step: 'Phase 2', description: '7-step onboarding gate triggered 68% drop-off at KYC', date: 'Month 2' },
                { step: 'Phase 3', description: 'Emergency 3-step progressive onboarding and merge queue deployed', date: 'Month 3' },
              ],
              keyLessons: found.keyLessons || found.lessons_learned || [
                'Never enforce mandatory blocking integrations on initial user workspace setup.',
                'Isolate test quarantine queues before compounding defect debt paralyzes release branches.',
                'Progressive onboarding sandboxes achieve 2.1x higher trial-to-paid conversions.',
              ],
            });
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [caseId]);


  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto w-full">
          {/* Top Breadcrumb */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Global Historical Search</span>
            </Link>

            {histCase && (
              <div className="flex items-center gap-2">
                <PrivacyBadge level={histCase.privacyLevel} />
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  {histCase.similarity}% Vector Similarity to Aurora
                </span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-16 rounded-2xl bg-card border border-border flex items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span>Retrieving historical failure and recovery telemetry...</span>
              </div>
            </div>
          ) : !histCase ? (
            <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
              <p className="text-base font-bold text-foreground">Historical Case Not Found</p>
              <p className="text-xs text-muted-foreground">No historical benchmark case matched the identifier &quot;{caseId}&quot;.</p>
              <Link href="/search" className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl">
                Return to Global Search
              </Link>
            </div>
          ) : (
            <>
              {/* Title Banner */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <History className="w-3.5 h-3.5 text-primary" />
                  <span>{histCase.companyAlias} • {histCase.industry}</span>
                </div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                  {histCase.name}: Historical Failure & Recovery Case
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {histCase.productDescription}
                </p>
              </div>

              {/* Key Findings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-card border border-rose-500/30 shadow-md space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 block">
                    Primary Failure Pattern
                  </span>
                  <h3 className="text-base font-bold text-foreground">{histCase.primaryFailurePattern}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {histCase.outcome}
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-emerald-500/30 shadow-md space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                    Historical Intervention Deployed
                  </span>
                  <h3 className="text-base font-bold text-foreground">Progressive Onboarding Redesign</h3>
                  <p className="text-xs text-emerald-300/90 leading-relaxed pt-1">
                    {histCase.interventionOutcome}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Incident & Recovery Timeline
                </h3>
                <div className="space-y-3">
                  {histCase.timeline.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-3 rounded-xl bg-surface-feed/70 border border-border/60 text-xs">
                      <span className="px-2 py-0.5 rounded bg-card border border-border font-mono font-bold text-primary shrink-0">
                        {t.step}
                      </span>
                      <div>
                        <span className="font-semibold text-foreground">{t.description}</span>
                        <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">{t.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lessons Learned */}
              <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/30 shadow-md space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Institutional Lessons Learned
                </h3>
                <div className="space-y-2 text-xs text-purple-200/90">
                  {histCase.keyLessons.map((lesson, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

    </div>
  );
}
