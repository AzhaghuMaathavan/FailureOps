'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrivacyLevel, EvidenceSourceType } from '@/types';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import {
  RegisterHeader,
  btnPrimary,
  btnGhost,
  cardElevation,
  focusRing,
} from '@/components/landing/chrome';

const STEP_LABELS = ['Product details', 'Evidence sources', 'Privacy'] as const;

const STEP_COPY = [
  {
    kicker: 'REGISTER PRODUCT',
    title: 'Name the product the enclave will watch.',
    titleMobile: 'Name the product the enclave will watch.',
    body: 'These details stay on the project. You can change them later in settings.',
    bodyOnMobile: true,
  },
  {
    kicker: 'REGISTER PRODUCT',
    title: 'What evidence can the enclave use?',
    titleMobile: 'Which evidence can the enclave use?',
    body: 'Select sources now. You can upload files after the project exists. Privacy stays PRIVATE by default.',
    bodyOnMobile: false,
  },
  {
    kicker: 'REGISTER PRODUCT',
    title: 'Who can access this evidence?',
    titleMobile: 'Who can access this evidence?',
    body: 'Configure data isolation for this project. FailureOps guarantees cryptographic privacy by default.',
    bodyOnMobile: true,
  },
] as const;

const evidenceOptions = [
  {
    type: 'PRODUCT_PLAN' as EvidenceSourceType,
    title: 'Product plans / PRDs',
    shortTitle: 'PRDs',
    description: 'Roadmaps, PRDs, project milestones, spec sheets and requirements.',
  },
  {
    type: 'CUSTOMER_FEEDBACK' as EvidenceSourceType,
    title: 'Customer feedback',
    shortTitle: 'Feedback',
    description: 'Surveys, churn interviews, reviews, and support ticket clusters.',
  },
  {
    type: 'PRODUCT_METRICS' as EvidenceSourceType,
    title: 'Product metrics',
    shortTitle: 'Metrics',
    description: 'User activation, retention, trial abandonment, engagement telemetry.',
  },
  {
    type: 'ENGINEERING_METRICS' as EvidenceSourceType,
    title: 'CI/CD telemetry',
    shortTitle: 'CI/CD',
    description: 'Bugs, CI/CD build failures, deployment breakages, MTTR metrics.',
  },
  {
    type: 'TEAM_OPERATIONS' as EvidenceSourceType,
    title: 'Issue tracker',
    shortTitle: 'Jira',
    description: 'PR review latencies, sprint workload, engineer overtime, context switching.',
  },
  {
    type: 'INCIDENT_REPORTS' as EvidenceSourceType,
    title: 'Incident & postmortem reports',
    shortTitle: 'Incidents',
    description: 'Production downtime, staging deadlocks, migration rollbacks.',
  },
];

const privacyOptions: {
  id: PrivacyLevel;
  title: string;
  description: string;
}[] = [
  {
    id: 'PRIVATE',
    title: 'Private enclave',
    description:
      'Only authorized members of this project can access raw source evidence. No raw documents leave the isolated enclave.',
  },
  {
    id: 'ORGANIZATION',
    title: 'Organization scope',
    description: 'Available to all authorized employees and teams across the verified organization account.',
  },
  {
    id: 'ANONYMOUS_LEARNING',
    title: 'Anonymous learning',
    description:
      'FailureOps may extract generalized, zero-knowledge failure vectors to strengthen institutional memory without revealing company identity or raw files.',
  },
  {
    id: 'PUBLIC',
    title: 'Public case study',
    description: 'Designated as a public learning artifact for open industry postmortems and research.',
  },
];

const fieldClass = cn(
  'w-full min-h-11 rounded-xl border border-border bg-surface-feed px-3.5 py-2.5 text-sm font-medium text-foreground',
  'placeholder:text-muted-foreground',
  focusRing,
  'focus-visible:border-ring'
);

export default function RegisterProductPage() {
  const router = useRouter();
  const { setProject } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const errorRef = useRef<HTMLDivElement>(null);

  const defaultDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [productName, setProductName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('Enterprise SaaS');
  const [stage, setStage] = useState('Beta');
  const [targetUsers, setTargetUsers] = useState('');
  const [expectedLaunchDate, setExpectedLaunchDate] = useState(defaultDate);

  const [selectedSources, setSelectedSources] = useState<EvidenceSourceType[]>([
    'PRODUCT_PLAN',
    'CUSTOMER_FEEDBACK',
    'PRODUCT_METRICS',
  ]);

  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('PRIVATE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (submitError) {
      errorRef.current?.focus();
    }
  }, [submitError]);

  const toggleSource = (source: EvidenceSourceType) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const handleNextStep = () => {
    setSubmitError(null);
    if (step === 1) {
      if (!productName.trim() || productName.trim().length < 2) {
        setSubmitError('Please enter a valid product name (minimum 2 characters).');
        return;
      }
      if (!companyName.trim() || companyName.trim().length < 2) {
        setSubmitError('Please enter a valid company name (minimum 2 characters).');
        return;
      }
    } else if (step === 2) {
      if (selectedSources.length === 0) {
        setSubmitError('Please select at least one evidence source to continue.');
        return;
      }
    }
    if (step < 3) setStep((step + 1) as 1 | 2 | 3);
  };

  const handleFinish = async () => {
    setSubmitError(null);
    if (!productName.trim() || productName.trim().length < 2) {
      setSubmitError('Product name is required (minimum 2 characters).');
      setStep(1);
      return;
    }
    if (!companyName.trim() || companyName.trim().length < 2) {
      setSubmitError('Company name is required (minimum 2 characters).');
      setStep(1);
      return;
    }
    if (selectedSources.length === 0) {
      setSubmitError('Please select at least one evidence source.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const { apiClient } = await import('@/lib/api/client');
      const created = await apiClient.registerProject({
        name: productName.trim(),
        company: companyName.trim(),
        description: description.trim() || undefined,
        industry,
        stage,
        targetUsers: targetUsers.trim() || undefined,
        expectedLaunchDate: expectedLaunchDate || defaultDate,
        privacyLevel,
        sourcesUploaded: selectedSources,
      });

      setProject(created);
      router.push(`/projects/${created.id}/upload`);
    } catch (err: any) {
      setSubmitError(err.message || 'Unable to register project. Please verify the input fields.');
      setIsSubmitting(false);
    }
  };

  const copy = STEP_COPY[step - 1];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#register-main"
        className={cn(
          'sr-only z-50 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg',
          focusRing
        )}
      >
        Skip to form
      </a>

      <RegisterHeader step={step} stepLabel={STEP_LABELS[step - 1]} />

      <main id="register-main" className="flex flex-1 flex-col">
        <form
          className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-3 px-4 pb-8 pt-2 sm:gap-4 sm:pt-6 md:gap-4 md:pb-16 md:pt-12"
          onSubmit={e => {
            e.preventDefault();
            if (step < 3) handleNextStep();
            else void handleFinish();
          }}
          noValidate
        >
          <div className="hidden md:block">
            <p className="font-mono text-[11px] font-bold text-primary">{copy.kicker}</p>
          </div>

          <h1 className="text-[22px] font-extrabold leading-tight text-foreground md:text-[28px]">
            <span className="md:hidden">{copy.titleMobile}</span>
            <span className="hidden md:inline">{copy.title}</span>
          </h1>

          <p
            className={cn(
              'text-sm text-muted-foreground',
              !copy.bodyOnMobile && 'hidden md:block'
            )}
          >
            {copy.body}
          </p>

          {submitError && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-xs text-destructive"
            >
              {submitError}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="product-name" className="mb-1.5 block text-sm font-semibold text-foreground">
                    Product name
                  </label>
                  <input
                    id="product-name"
                    name="productName"
                    type="text"
                    autoComplete="organization"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. ExpenseTracker"
                    aria-invalid={Boolean(submitError && productName.trim().length < 2)}
                    required
                    minLength={2}
                  />
                </div>
                <div>
                  <label htmlFor="company-name" className="mb-1.5 block text-sm font-semibold text-foreground">
                    Company name
                  </label>
                  <input
                    id="company-name"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. Aurora Technologies"
                    required
                    minLength={2}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="product-description" className="mb-1.5 block text-sm font-semibold text-foreground">
                  Product description
                </label>
                <textarea
                  id="product-description"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className={cn(fieldClass, 'leading-relaxed')}
                  placeholder="Describe product capabilities, value proposition, and current operational focus..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="industry" className="mb-1.5 block text-sm font-semibold text-foreground">
                    Industry
                  </label>
                  <select
                    id="industry"
                    name="industry"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className={fieldClass}
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
                  <label htmlFor="stage" className="mb-1.5 block text-sm font-semibold text-foreground">
                    Current stage
                  </label>
                  <select
                    id="stage"
                    name="stage"
                    value={stage}
                    onChange={e => setStage(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="Idea">Idea / Concept</option>
                    <option value="Planning">Planning / Spec</option>
                    <option value="Development">In Development</option>
                    <option value="Beta">Beta Testing</option>
                    <option value="Launched">Launched / Production</option>
                    <option value="General Availability">General Availability</option>
                    <option value="Scaling">Growth / Scaling</option>

                  </select>
                </div>
                <div>
                  <label htmlFor="launch-date" className="mb-1.5 block text-sm font-semibold text-foreground">
                    Launch target
                  </label>
                  <input
                    id="launch-date"
                    name="expectedLaunchDate"
                    type="date"
                    value={expectedLaunchDate}
                    onChange={e => setExpectedLaunchDate(e.target.value)}
                    className={cn(fieldClass, 'font-mono')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="target-users" className="mb-1.5 block text-sm font-semibold text-foreground">
                  Target user personas
                </label>
                <input
                  id="target-users"
                  name="targetUsers"
                  type="text"
                  value={targetUsers}
                  onChange={e => setTargetUsers(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. SMB Finance Managers & Operations Leads"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Evidence sources the enclave can use</legend>
              {evidenceOptions.map(opt => {
                const isOn = selectedSources.includes(opt.type);
                return (
                  <button
                    key={opt.type}
                    type="button"
                    aria-pressed={isOn}
                    aria-describedby={`${opt.type}-desc`}
                    onClick={() => toggleSource(opt.type)}
                    className={cn(
                      'flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3.5 text-left md:px-4',
                      cardElevation,
                      focusRing
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        <span className="md:hidden">{opt.shortTitle}</span>
                        <span className="hidden md:inline">{opt.title}</span>
                      </span>
                      <span id={`${opt.type}-desc`} className="sr-only">
                        {opt.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-mono text-[11px] font-bold md:text-[10px] md:font-medium',
                        isOn
                          ? 'text-success md:rounded-full md:border md:border-success md:bg-surface-feed md:px-2 md:py-1'
                          : 'text-muted-foreground'
                      )}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Privacy and governance</legend>
              {privacyOptions.map(opt => {
                const isOn = privacyLevel === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3.5 md:px-4',
                      cardElevation,
                      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{opt.title}</span>
                      <span className="mt-1 hidden text-xs leading-relaxed text-muted-foreground md:block">
                        {opt.description}
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="privacyLevel"
                      value={opt.id}
                      checked={isOn}
                      onChange={() => setPrivacyLevel(opt.id)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'shrink-0 font-mono text-[11px] font-bold md:text-[10px] md:font-medium',
                        isOn
                          ? 'text-success md:rounded-full md:border md:border-success md:bg-surface-feed md:px-2 md:py-1'
                          : 'text-muted-foreground'
                      )}
                      aria-hidden="true"
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  if (step > 1) setStep((step - 1) as 1 | 2 | 3);
                }}
                className={btnGhost('w-full sm:w-auto')}
              >
                Back
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}

            {step < 3 ? (
              <button type="submit" className={btnPrimary('w-full sm:w-auto')}>
                {step === 2 ? 'Continue to privacy' : 'Continue'}
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting} className={btnPrimary('w-full sm:w-auto')}>
                {isSubmitting ? 'Creating Project...' : 'Create Project & Build Intelligence'}
              </button>

            )}
          </div>
        </form>
      </main>
    </div>
  );
}
