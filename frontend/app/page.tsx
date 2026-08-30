import Link from 'next/link';
import {
  FileSearch,
  Dna,
  Scale,
  Database,
  Radar,
  GitFork,
  Lightbulb,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LandingHeader,
  LandingFooter,
  btnPrimary,
  btnSecondary,
  cardElevation,
  focusRing,
} from '@/components/landing/chrome';

const PIPELINE: { label: string; href: string; active?: boolean }[] = [
  { label: 'Evidence', href: '/projects/aurora/evidence', active: true },
  { label: 'Signals', href: '/projects/aurora/signals' },
  { label: 'DNA', href: '/projects/aurora/dna' },
  { label: 'Truth', href: '/projects/aurora/truth-engine' },
  { label: 'Radar', href: '/projects/aurora/radar' },
  { label: 'Predict', href: '/projects/aurora/prediction' },
  { label: 'Intervene', href: '/projects/aurora/interventions' },
  { label: 'Verify', href: '/projects/aurora/outcomes' },
];

const ENGINES = [
  {
    title: 'Evidence Intelligence',
    description: 'Ingest PRDs, feedback, CI/CD, and Jira into an encrypted reasoning enclave.',
    icon: FileSearch,
    href: '/projects/aurora/evidence',
  },
  {
    title: 'Failure DNA',
    description: 'Multidimensional fingerprint: Technical, Operational, Adoption, Execution, Customer.',
    icon: Dna,
    href: '/projects/aurora/dna',
  },
  {
    title: 'Truth Engine',
    description: 'Challenge team dogma against cross-source reality before it hardens.',
    icon: Scale,
    href: '/projects/aurora/truth-engine',
  },
  {
    title: 'Historical Memory',
    description: 'Match the current trajectory to verified past failures and recoveries.',
    icon: Database,
    href: '/historical/atlas',
  },
  {
    title: 'Failure Radar',
    description: 'Watch weak-signal escalation and forecast the next milestone.',
    icon: Radar,
    href: '/projects/aurora/radar',
  },
  {
    title: 'Causal Reasoning',
    description: 'Link overload and flaky CI directly to missed delivery horizons.',
    icon: GitFork,
    href: '/projects/aurora/causal',
  },
  {
    title: 'Interventions',
    description: 'Playbooks with empirical success rates from similar products.',
    icon: Lightbulb,
    href: '/projects/aurora/interventions',
  },
  {
    title: 'Outcome Verification',
    description: 'Measure lift, then store what worked in institutional memory.',
    icon: CheckCircle2,
    href: '/projects/aurora/outcomes',
  },
] as const;

const METRICS = [
  {
    value: '82%',
    color: 'text-destructive',
    short: 'Risk',
    long: 'Aurora failure risk',
  },
  {
    value: '+33pp',
    color: 'text-success',
    short: 'Lift',
    long: 'Recovery after experiment',
  },
  {
    value: '5',
    color: 'text-info',
    short: 'Sources',
    long: 'Evidence sources live',
  },
  {
    value: 'AES-256',
    color: 'text-primary',
    short: 'Enclave',
    long: 'Zero-knowledge enclave',
  },
] as const;

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-12 h-[420px] w-[min(720px,100%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,122,0,0.16),transparent_70%)] blur-3xl"
      />

      <a
        href="#main"
        className={cn(
          'sr-only z-50 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg',
          focusRing
        )}
      >
        Skip to content
      </a>

      <LandingHeader />

      <main id="main" className="relative z-10 flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pb-8 pt-6 sm:px-6 md:gap-10 md:pb-16 md:pt-10 lg:gap-10 lg:px-20 lg:pb-16 lg:pt-14">
          <section className="flex flex-col items-start gap-3.5 lg:items-center lg:gap-4" aria-labelledby="hero-heading">
            <div className="inline-flex items-center gap-2 rounded-full border border-ring bg-primary-muted px-3 py-1.5">
              <span
                className="size-1.5 shrink-0 rounded-full bg-success motion-safe:animate-pulse"
                aria-hidden="true"
              />
              <p className="font-mono text-[10px] font-medium text-primary sm:text-[11px]">
                <span className="lg:hidden">LIVE · 12s</span>
                <span className="hidden lg:inline">LIVE · Enclave telemetry 12s ago</span>
              </p>
            </div>

            <h1
              id="hero-heading"
              className="max-w-[820px] text-[26px] font-extrabold leading-tight tracking-tight text-foreground lg:text-center lg:text-[48px] lg:tracking-[-1.44px]"
            >
              <span className="lg:hidden">See failure signals before they become failure.</span>
              <span className="hidden lg:inline">See the failure signals before they become failure.</span>
            </h1>

            <p className="max-w-[680px] text-sm leading-relaxed text-muted-foreground lg:text-center lg:text-base">
              <span className="lg:hidden">
                Evidence, DNA, radar, and memory — built for one thumb and a 44px tap.
              </span>
              <span className="hidden lg:inline">
                Connect fragmented evidence, detect hidden patterns, predict the next failure, and lock in
                interventions that actually worked.
              </span>
            </p>

            <div className="flex w-full flex-col gap-3 pt-1 sm:flex-row sm:justify-center lg:w-auto">
              <Link href="/register" className={btnPrimary('w-full sm:w-auto')}>
                Analyze a Product
              </Link>
              <Link href="/memory" className={btnSecondary('w-full sm:w-auto')}>
                Explore Memory
              </Link>
            </div>
          </section>

          <section aria-label="Trust metrics" className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
            {METRICS.map(metric => (
              <div
                key={metric.long}
                className={cn(
                  'flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-3.5 lg:px-5 lg:py-4',
                  cardElevation
                )}
              >
                <p
                  className={cn(
                    'order-2 font-mono text-xl font-bold lg:order-1 lg:text-[22px]',
                    metric.color
                  )}
                >
                  {metric.value}
                </p>
                <p className="order-1 font-mono text-[9px] font-medium text-muted-foreground lg:order-2 lg:font-sans lg:text-xs lg:font-normal">
                  <span className="lg:hidden">{metric.short}</span>
                  <span className="hidden lg:inline">{metric.long}</span>
                </p>
              </div>
            ))}
          </section>

          <nav
            aria-label="Intelligence pipeline"
            className="hidden flex-wrap items-center justify-center gap-2 md:flex"
          >
            {PIPELINE.map(step => (
              <Link
                key={step.label}
                href={step.href}
                className={cn(
                  'cursor-pointer rounded-lg px-3 py-2 text-[11px] font-semibold motion-safe:transition-colors',
                  focusRing,
                  step.active
                    ? 'border border-ring bg-primary-muted text-primary'
                    : cn(
                        'border border-border bg-card text-muted-foreground hover:text-foreground',
                        cardElevation
                      )
                )}
              >
                {step.label}
              </Link>
            ))}
          </nav>

          <section className="hidden flex-col items-center gap-1.5 md:flex" aria-labelledby="engines-heading">
            <div
              className="flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface-feed text-primary"
              aria-hidden="true"
            >
              <Cpu className="size-[18px]" />
            </div>
            <p className="text-[11px] font-bold tracking-[0.88px] text-primary">CORE INTELLIGENCE ENGINES</p>
            <h2 id="engines-heading" className="text-center text-[22px] font-semibold text-foreground">
              From weak telemetry to validated memory
            </h2>
          </section>

          <section className="hidden md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-4" aria-label="Core intelligence engines">
            {ENGINES.map(engine => {
              const Icon = engine.icon;
              return (
                <Link
                  key={engine.title}
                  href={engine.href}
                  className={cn(
                    'flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-5 motion-safe:transition-colors hover:border-primary/40 hover:bg-card-hover',
                    cardElevation,
                    focusRing
                  )}
                >
                  <div
                    className="flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface-feed text-primary"
                    aria-hidden="true"
                  >
                    <Icon className="size-[18px]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{engine.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{engine.description}</p>
                  <span className="text-xs font-semibold text-primary">Inspect engine →</span>
                </Link>
              );
            })}
          </section>

          <Link
            href="/projects/aurora/radar"
            className={cn(
              'flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-3.5 md:hidden',
              cardElevation,
              focusRing
            )}
          >
            <p className="text-sm font-semibold text-foreground">Failure Radar</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Watch weak-signal escalation. Open the briefing with one tap.
            </p>
          </Link>

          <section
            className={cn(
              'hidden w-full flex-col items-center gap-3 rounded-3xl border border-ring bg-card px-6 py-8 text-center lg:flex lg:px-10 lg:py-8',
              cardElevation
            )}
            aria-labelledby="walkthrough-heading"
          >
            <p className="font-mono text-[11px] font-bold text-primary">HACKATHON WALKTHROUGH</p>
            <h2 id="walkthrough-heading" className="text-[22px] font-bold text-foreground">
              Project Aurora: 82% risk to +33pp recovery
            </h2>
            <p className="max-w-[720px] text-[13px] leading-relaxed text-muted-foreground">
              Run the full early-warning loop on preloaded telemetry. See why pricing dogma was challenged — and how a
              3-step onboarding experiment saved the release.
            </p>
            <Link href="/projects/aurora/overview" className={btnPrimary()}>
              Launch Full Aurora Briefing
            </Link>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
