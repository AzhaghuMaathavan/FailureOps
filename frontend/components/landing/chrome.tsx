import Link from 'next/link';
import { cn } from '@/lib/utils';

export const cardElevation =
  'shadow-[0_1px_0_0_#0d1424,0_8px_24px_-8px_rgba(0,0,0,0.35)]';

export const primaryGlow = 'shadow-[0_0_24px_-4px_rgba(255,122,0,0.4)]';

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function btnPrimary(className?: string) {
  return cn(
    'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-primary px-[22px] py-3.5 text-[13px] font-bold text-primary-foreground motion-safe:transition-colors motion-safe:duration-200 hover:bg-primary-hover',
    primaryGlow,
    focusRing,
    'disabled:cursor-not-allowed disabled:opacity-50',
    className
  );
}

export function btnSecondary(className?: string) {
  return cn(
    'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-[22px] py-3.5 text-[13px] font-bold text-foreground motion-safe:transition-colors motion-safe:duration-200 hover:bg-card-hover',
    cardElevation,
    focusRing,
    className
  );
}

export function btnGhost(className?: string) {
  return cn(
    'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface-feed px-4 py-2.5 text-xs font-bold text-foreground motion-safe:transition-colors motion-safe:duration-200 hover:bg-card-hover',
    focusRing,
    className
  );
}

import { FailureOpsLogo } from '@/components/common/FailureOpsLogo';

export function FxMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      <FailureOpsLogo size={size} glow={true} />
    </div>
  );
}


export function LandingHeader() {
  return (
    <header className="relative z-20 w-full border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-12">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className={cn(
            'flex min-h-11 items-center gap-2.5 overflow-hidden rounded-lg',
            focusRing
          )}
        >
          <FxMark />
          <span className="flex min-w-0 flex-col items-start leading-none">
            <span className="font-mono text-[11px] font-bold tracking-wide text-foreground sm:text-[13px]">
              FAILUREOPS X
            </span>
            <span className="mt-0.5 hidden text-[9px] font-medium text-muted-foreground sm:block">
              Early-warning intel
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-4 md:flex" aria-label="Landing">
          <Link
            href="/dashboard"
            className={cn(
              'cursor-pointer rounded-lg px-2 py-2 text-[13px] font-semibold text-muted-foreground motion-safe:transition-colors hover:text-foreground',
              focusRing
            )}
          >
            Dashboard
          </Link>
          <Link href="/projects/aurora/overview" className={btnPrimary()}>
            Live Aurora Demo
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function RegisterHeader({ step, stepLabel }: { step: number; stepLabel: string }) {
  return (
    <header className="relative z-20 w-full border-b border-border bg-background px-4 py-3.5 sm:px-6 lg:px-12">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className={cn('flex items-center gap-2.5 rounded-lg p-1 -ml-1', focusRing)}
        >
          <FxMark size={28} />
          <span className="font-mono text-sm font-bold text-foreground">
            FAILUREOPS <span className="text-primary">X</span>
          </span>
          <span className="sr-only"> — home</span>
        </Link>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          <span className="md:hidden">
            {step} / 3
          </span>
          <span className="hidden md:inline">
            Step {step} of 3 · {stepLabel}
          </span>
        </p>
      </div>
    </header>
  );
}


export function LandingFooter() {
  return (
    <footer className="relative z-10 hidden border-t border-border bg-background px-6 py-6 lg:flex lg:items-center lg:justify-between lg:px-20">
      <p className="text-xs text-muted-foreground">
        FailureOps X · AES-256 enclave · Zero-knowledge proofs
      </p>
      <p className="font-mono text-[11px] font-medium text-muted-foreground">
        Desktop 1440 · Mobile 375
      </p>
    </footer>
  );
}
