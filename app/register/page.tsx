'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Layers,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Users,
  Sparkles,
  HelpCircle,
  FolderPlus,
} from 'lucide-react';
import { PrivacyLevel, EvidenceSourceType } from '@/types';
import { useApp } from '@/context/AppContext';

export default function RegisterProductPage() {
  const router = useRouter();
  const { setProject } = useApp();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [productName, setProductName] = useState('ExpenseTracker');
  const [companyName, setCompanyName] = useState('Aurora Technologies');
  const [description, setDescription] = useState('Expense management & corporate card intelligence platform for fast-scaling SMBs.');
  const [industry, setIndustry] = useState('FinTech');
  const [stage, setStage] = useState('Beta');
  const [targetUsers, setTargetUsers] = useState('SMB Finance Managers & Operations Leads');
  const [expectedLaunchDate, setExpectedLaunchDate] = useState('2026-10-15');

  const [selectedSources, setSelectedSources] = useState<EvidenceSourceType[]>([
    'PRODUCT_PLAN',
    'CUSTOMER_FEEDBACK',
    'PRODUCT_METRICS',
    'ENGINEERING_METRICS',
    'TEAM_OPERATIONS',
  ]);

  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('PRIVATE');

  const handlePreFillAurora = () => {
    setProductName('ExpenseTracker');
    setCompanyName('Aurora Technologies');
    setDescription('Expense management & corporate card intelligence platform for fast-scaling SMBs.');
    setIndustry('FinTech');
    setStage('Beta');
    setTargetUsers('SMB Finance Managers & Operations Leads');
    setExpectedLaunchDate('2026-10-15');
  };

  const toggleSource = (source: EvidenceSourceType) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFinish = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { apiClient } = await import('@/lib/api/client');
      const created = await apiClient.registerProject({
        name: productName,
        company: companyName,
        description,
        industry,
        stage,
        targetUsers,
        expectedLaunchDate,
        privacyLevel,
        sourcesUploaded: selectedSources,
      });

      setProject(created);
      router.push(`/projects/${created.id}/upload`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to register project in database.');
      setIsSubmitting(false);
    }
  };


  const evidenceOptions = [
    {
      type: 'PRODUCT_PLAN' as EvidenceSourceType,
      title: 'Product / Project Plan',
      description: 'Roadmaps, PRDs, project milestones, spec sheets and requirements.',
      recommended: true,
    },
    {
      type: 'CUSTOMER_FEEDBACK' as EvidenceSourceType,
      title: 'Customer Feedback',
      description: 'Surveys, churn interviews, reviews, and support ticket clusters.',
      recommended: true,
    },
    {
      type: 'PRODUCT_METRICS' as EvidenceSourceType,
      title: 'Product Metrics',
      description: 'User activation, retention, trial abandonment, engagement telemetry.',
      recommended: true,
    },
    {
      type: 'ENGINEERING_METRICS' as EvidenceSourceType,
      title: 'Engineering Metrics',
      description: 'Bugs, CI/CD build failures, deployment breakages, MTTR metrics.',
      recommended: true,
    },
    {
      type: 'TEAM_OPERATIONS' as EvidenceSourceType,
      title: 'Team Operations',
      description: 'PR review latencies, sprint workload, engineer overtime, context switching.',
      recommended: true,
    },
    {
      type: 'INCIDENT_REPORTS' as EvidenceSourceType,
      title: 'Incident & Postmortem Reports',
      description: 'Production downtime, staging deadlocks, migration rollbacks.',
      recommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/30">
      {/* Top Bar */}
      <header className="h-16 w-full border-b border-border/80 px-6 lg:px-12 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white font-mono font-bold text-xs shadow-sm">
            FX
          </div>
          <span className="font-mono font-extrabold text-sm tracking-wider text-foreground">
            FAILUREOPS <span className="text-primary font-black">X</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={handlePreFillAurora}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-fill Project Aurora Demo</span>
          </button>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Cancel
          </Link>
        </div>
      </header>

      {/* Main Registration Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Step {step} of 3
            </span>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-0.5">
              {step === 1 && 'Product Information'}
              {step === 2 && 'Connect Evidence Sources'}
              {step === 3 && 'Privacy & Governance Enclave'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map(num => (
              <div
                key={num}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all ${
                  num === step
                    ? 'bg-primary text-white shadow-sm'
                    : num < step
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-surface-feed text-muted-foreground border border-border'
                }`}
              >
                {num < step ? '✓' : num}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Product Information */}
        {step === 1 && (
          <div className="space-y-5 p-6 rounded-2xl bg-card border border-border/80 shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium"
                  placeholder="e.g. ExpenseTracker"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium"
                  placeholder="e.g. Aurora Technologies"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Product Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium leading-relaxed"
                placeholder="Describe product capabilities, value proposition, and current operational focus..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium"
                >
                  <option value="FinTech">FinTech</option>
                  <option value="Enterprise SaaS">Enterprise SaaS</option>
                  <option value="DevTools">Developer Tools / IDE</option>
                  <option value="HealthTech">Healthcare / HealthTech</option>
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="AI / ML">AI Platform</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Current Stage
                </label>
                <select
                  value={stage}
                  onChange={e => setStage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium"
                >
                  <option value="Alpha">Alpha</option>
                  <option value="Beta">Beta</option>
                  <option value="Pre-Launch">Pre-Launch</option>
                  <option value="General Availability">General Availability</option>
                  <option value="Scaling">Growth / Scaling</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Launch Target
                </label>
                <input
                  type="date"
                  value={expectedLaunchDate}
                  onChange={e => setExpectedLaunchDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Target User Personas
              </label>
              <input
                type="text"
                value={targetUsers}
                onChange={e => setTargetUsers(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium"
                placeholder="e.g. SMB Finance Managers & Operations Leads"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Evidence Sources Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary leading-relaxed">
              <span className="font-bold">Cross-Source Intelligence Rule: </span>
              FailureOps works best when it can connect signals from multiple sources (e.g. cross-referencing PR review latency against bug backlogs and trial activation drop-offs).
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {evidenceOptions.map(opt => {
                const isChecked = selectedSources.includes(opt.type);

                return (
                  <div
                    key={opt.type}
                    onClick={() => toggleSource(opt.type)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isChecked
                        ? 'bg-card border-primary ring-1 ring-primary/40'
                        : 'bg-surface-feed/60 border-border/70 hover:border-border'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-foreground">{opt.title}</span>
                        {opt.recommended && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            RECOMMENDED CORE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-muted-foreground">{opt.type}</span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                          isChecked ? 'bg-primary text-white' : 'border border-border bg-card'
                        }`}
                      >
                        {isChecked && '✓'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Privacy & Governance */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure data isolation policies for this project. FailureOps guarantees cryptographic privacy by default.
            </p>

            <div className="space-y-3">
              {[
                {
                  id: 'PRIVATE' as PrivacyLevel,
                  title: 'PRIVATE ENCLAVE (Default)',
                  description: 'Only authorized members of this project can access raw source evidence. No raw documents leave the isolated enclave.',
                  badge: 'Highest Security',
                },
                {
                  id: 'ORGANIZATION' as PrivacyLevel,
                  title: 'ORGANIZATION SCOPE',
                  description: 'Available to all authorized employees and teams across the verified organization account.',
                  badge: 'Team Access',
                },
                {
                  id: 'ANONYMOUS_LEARNING' as PrivacyLevel,
                  title: 'ANONYMOUS LEARNING',
                  description: 'FailureOps may extract generalized, zero-knowledge failure vectors to strengthen institutional memory without revealing company identity or raw files.',
                  badge: 'Collective Intel',
                },
                {
                  id: 'PUBLIC' as PrivacyLevel,
                  title: 'PUBLIC CASE STUDY',
                  description: 'Designated as a public learning artifact for open industry postmortems and research.',
                  badge: 'Open Access',
                },
              ].map(opt => {
                const isSelected = privacyLevel === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setPrivacyLevel(opt.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-card border-primary ring-1 ring-primary/40 shadow-sm'
                        : 'bg-surface-feed/60 border-border/70 hover:border-border'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{opt.title}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-surface-feed border border-border text-muted-foreground">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                        {opt.description}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${
                        isSelected ? 'bg-primary text-white' : 'border border-border bg-card'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-border/80">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {submitError}
            </div>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-wide transition-all shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(255,122,0,0.4)]"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering in Database...' : 'Register & Build Evidence Base'}</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
