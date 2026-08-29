'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Database, ArrowLeft, History, CheckCircle2, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { getHistoricalCaseById, mockHistoricalCases } from '@/data/mockHistoricalCases';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';

export default function HistoricalCaseDetailPage() {
  const params = useParams();
  const caseId = (params?.id as string) || 'atlas';
  const histCase = getHistoricalCaseById(caseId);

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

            <div className="flex items-center gap-2">
              <PrivacyBadge level={histCase.privacyLevel} />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                {histCase.similarity}% Vector Similarity to Aurora
              </span>
            </div>
          </div>

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
        </main>
      </div>
    </div>
  );
}
