'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PlusCircle,
  Shield,
  ShieldAlert,
  Lock,
  Globe,
  Building2,
  Sparkles,
  HelpCircle,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Tag,
  Dna,
  CheckCircle2,
} from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { SensitiveDataModal } from '@/components/community/SensitiveDataModal';
import { apiClient } from '@/lib/api/client';
import { CommunityPostType, CommunityVisibility, SensitiveScanResult } from '@/types';

export default function CreateCommunityPostPage() {
  const router = useRouter();

  // Form Fields
  const [postType, setPostType] = useState<CommunityPostType>('FAILURE_REPORT');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [productContext, setProductContext] = useState('');
  const [failureDimension, setFailureDimension] = useState('ADOPTION');
  const [pattern, setPattern] = useState('');
  const [observedFailure, setObservedFailure] = useState('');
  const [recoveryStrategy, setRecoveryStrategy] = useState('');
  const [verifiedOutcome, setVerifiedOutcome] = useState('');
  const [rawTags, setRawTags] = useState('');
  const [visibility, setVisibility] = useState<CommunityVisibility>('PRIVATE');

  // Scanner & Submitting State
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<SensitiveScanResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const postTypes: { id: CommunityPostType; label: string; desc: string; icon: any }[] = [
    {
      id: 'FAILURE_REPORT',
      label: 'Failure Report',
      desc: 'Empirical record of an obstacle, adoption block, or architectural breakdown',
      icon: AlertTriangle,
    },
    {
      id: 'QUESTION',
      label: 'Question',
      desc: 'Ask the community for advice or experience on a failure scenario',
      icon: HelpCircle,
    },
    {
      id: 'LESSON',
      label: 'Lesson Learned',
      desc: 'Key takeaways and architectural insights from a project milestone',
      icon: BookOpen,
    },
    {
      id: 'RECOVERY',
      label: 'Recovery Strategy',
      desc: 'Detailed playbook on how a declining metric or product issue was resolved',
      icon: RefreshCw,
    },
    {
      id: 'DISCUSSION',
      label: 'Discussion',
      desc: 'Open trade-off debate on product decisions, frameworks, or metrics',
      icon: MessageSquare,
    },
  ];

  const dimensions = [
    'ADOPTION',
    'TECHNICAL',
    'OPERATIONAL',
    'EXECUTION',
    'PRICING',
    'ONBOARDING',
    'RETENTION',
    'LAUNCH',
    'SECURITY',
    'PERFORMANCE',
  ];

  const visibilityOptions: { id: CommunityVisibility; label: string; desc: string; icon: any }[] = [
    {
      id: 'PRIVATE',
      label: 'Private (Enclave Only)',
      desc: 'Only visible to you and your private project reasoning enclave. Never shared externally.',
      icon: Lock,
    },
    {
      id: 'ORGANIZATION',
      label: 'Organization Internal',
      desc: 'Visible to authorized members within your company tenant only.',
      icon: Building2,
    },
    {
      id: 'COMMUNITY',
      label: 'FailureOps Community',
      desc: 'Published to the verified FailureOps peer community for discussion.',
      icon: Globe,
    },
    {
      id: 'GLOBAL_SANITIZED',
      label: 'Global Sanitized Intelligence',
      desc: 'Sanitized pattern promoted to global failure prediction models with zero PII.',
      icon: Sparkles,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please provide a title.');
      return;
    }
    if (!summary.trim()) {
      setErrorMessage('Please provide a short summary.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Please provide detailed content.');
      return;
    }

    // If publishing publicly or to organization, perform automated pre-publish safety scan
    if (visibility !== 'PRIVATE') {
      setIsScanning(true);
      try {
        const fullText = `${title}\n${summary}\n${content}\n${observedFailure}\n${recoveryStrategy}`;
        const scan = await apiClient.scanCommunityContent(fullText);
        if (scan.has_sensitive_data) {
          setScanResult(scan);
          setIsModalOpen(true);
          setIsScanning(false);
          return;
        }
      } catch (err) {
        console.warn('Safety scan failed, continuing cautiously:', err);
      } finally {
        setIsScanning(false);
      }
    }

    // Proceed to execute post creation
    executePublish();
  };

  const executePublish = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const tagsArray = rawTags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter((t) => t.length > 0);

    try {
      const created = await apiClient.createCommunityPost({
        post_type: postType,
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        product_context: productContext.trim() || undefined,
        failure_dimension: failureDimension,
        pattern: pattern.trim() || undefined,
        observed_failure: observedFailure.trim() || undefined,
        recovery_strategy: recoveryStrategy.trim() || undefined,
        verified_outcome: verifiedOutcome.trim() || undefined,
        tags: tagsArray,
        visibility,
      });

      setIsModalOpen(false);
      router.push(`/community/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="flex-1 px-4 py-6 lg:px-8 max-w-4xl w-full mx-auto space-y-6 pb-16">
          {/* Back link */}
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Community Knowledge Hub</span>
          </Link>

          {/* Page Title */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Share a Product / Project Experience
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Document empirical failure patterns, adoption hurdles, or recovery playbooks to help teams avoid repeat mistakes.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Post Type Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                1. Select Experience Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {postTypes.map((t) => {
                  const Icon = t.icon;
                  const isSelected = postType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPostType(t.id)}
                      className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm text-foreground'
                          : 'bg-card hover:bg-surface-feed border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-subtle'}`} aria-hidden="true" />
                        <span className={isSelected ? 'text-primary' : ''}>{t.label}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Core Post Details */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                2. Experience Summary & Context
              </h2>

              <div>
                <label htmlFor="post-title" className="block text-xs font-semibold text-foreground mb-1">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="post-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Why our expense management product failed to activate users"
                  className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label htmlFor="post-summary" className="block text-xs font-semibold text-foreground mb-1">
                  Short Summary <span className="text-destructive">*</span>
                </label>
                <input
                  id="post-summary"
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Users completed initial signup but 42% abandoned before submitting their first expense report."
                  className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="post-product" className="block text-xs font-semibold text-foreground mb-1">
                    Product / Project Domain Context (Optional)
                  </label>
                  <input
                    id="post-product"
                    type="text"
                    value={productContext}
                    onChange={(e) => setProductContext(e.target.value)}
                    placeholder="e.g. B2B Fintech / Expense Management"
                    className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="post-dimension" className="block text-xs font-semibold text-foreground mb-1">
                    Failure Dimension
                  </label>
                  <select
                    id="post-dimension"
                    value={failureDimension}
                    onChange={(e) => setFailureDimension(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {dimensions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="post-content" className="block text-xs font-semibold text-foreground mb-1">
                  Detailed Description & Empirical Analysis <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="post-content"
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe the root cause, what data or telemetry signaled the issue, and what unexpected obstacles occurred..."
                  className="w-full rounded-lg border border-border bg-surface-feed p-3 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  required
                />
              </div>
            </div>

            {/* 3. Failure & Recovery Breakdown (Optional but high value) */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                3. Observed Failure & Recovery Strategy (Optional)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="post-pattern" className="block text-xs font-semibold text-foreground mb-1">
                    Failure Pattern Name
                  </label>
                  <input
                    id="post-pattern"
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="e.g. Onboarding Friction / Verification Delay"
                    className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="post-observed" className="block text-xs font-semibold text-foreground mb-1">
                    Observed Metric Decline
                  </label>
                  <input
                    id="post-observed"
                    type="text"
                    value={observedFailure}
                    onChange={(e) => setObservedFailure(e.target.value)}
                    placeholder="e.g. 38% drop in Day-7 active user retention"
                    className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="post-recovery" className="block text-xs font-semibold text-foreground mb-1">
                  Recovery Strategy / Intervention Implemented
                </label>
                <textarea
                  id="post-recovery"
                  rows={2}
                  value={recoveryStrategy}
                  onChange={(e) => setRecoveryStrategy(e.target.value)}
                  placeholder="e.g. Reduced mandatory onboarding fields from 12 to 3, introducing progressive disclosure."
                  className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="post-outcome" className="block text-xs font-semibold text-foreground mb-1">
                  Verified Outcome (Post-Intervention Result)
                </label>
                <input
                  id="post-outcome"
                  type="text"
                  value={verifiedOutcome}
                  onChange={(e) => setVerifiedOutcome(e.target.value)}
                  placeholder="e.g. Activation increased by +32% within 3 weeks; onboarding completion reached 84%."
                  className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="post-tags" className="block text-xs font-semibold text-foreground mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  id="post-tags"
                  type="text"
                  value={rawTags}
                  onChange={(e) => setRawTags(e.target.value)}
                  placeholder="onboarding, adoption, b2b-saas, activation, retention"
                  className="w-full rounded-lg border border-border bg-surface-feed p-2.5 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* 4. Privacy & Visibility Controls */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                <Shield className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>4. Privacy & Visibility Scope (Default: Private)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Control exactly who is permitted to access this failure knowledge. Private company documents and secrets remain protected.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {visibilityOptions.map((v) => {
                  const Icon = v.icon;
                  const isSelected = visibility === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVisibility(v.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm'
                          : 'bg-surface-feed hover:bg-card border-border'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-primary' : 'text-subtle'}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-foreground mb-0.5">{v.label}</div>
                        <div className="text-[11px] text-muted-foreground leading-tight">{v.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Toolbar */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Link
                href="/community"
                className="px-4 py-2 rounded-xl border border-border bg-surface-feed hover:bg-card text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || isScanning}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all duration-150 shadow-primary-glow cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isScanning
                    ? 'Screening Security & Privacy...'
                    : isSubmitting
                    ? 'Publishing Experience...'
                    : 'Publish Experience'}
                </span>
              </button>
            </div>
          </form>

          {/* Sensitive Data Modal Interception */}
          {scanResult && (
            <SensitiveDataModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onConfirmPublishAnyway={executePublish}
              scanResult={scanResult}
              isSubmitting={isSubmitting}
            />
          )}
        </main>
      </div>
    </div>
  );
}
