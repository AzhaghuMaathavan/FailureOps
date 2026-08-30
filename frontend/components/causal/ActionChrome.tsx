'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const cardShadow =
  'shadow-[0_1px_0_0_rgba(13,20,36,0.08),0_8px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_0_0_#0d1424,0_8px_24px_-8px_rgba(0,0,0,0.35)]';

export const actionPrimaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-[12px] font-bold transition-colors duration-200 cursor-pointer shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none w-full sm:w-auto';

export const kpiGridClass = 'grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3';
export const insightGridClass = 'grid grid-cols-1 md:grid-cols-2 gap-3';

const VALUE_TONES = {
  info: 'text-info',
  destructive: 'text-destructive',
  warning: 'text-warning',
  success: 'text-success',
  magic: 'text-magic',
  primary: 'text-primary',
  foreground: 'text-foreground',
} as const;

export function asPercent(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value <= 1 ? value * 100 : value);
}

export function ActionPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
  };
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.66px] text-primary sm:text-[11px]">
          {eyebrow}
        </p>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className={cn(actionPrimaryBtnClass, action.disabled && 'pointer-events-none opacity-50')}
            aria-disabled={action.disabled}
          >
            {action.icon}
            <span>{action.label}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={actionPrimaryBtnClass}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  caption,
  tone = 'foreground',
  wrap = false,
}: {
  label: string;
  value: React.ReactNode;
  caption?: string;
  tone?: keyof typeof VALUE_TONES;
  wrap?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3 sm:gap-1.5 sm:p-4',
        cardShadow,
      )}
    >
      <p className="font-mono text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
        {label}
      </p>
      <p
        className={cn(
          'font-mono text-[20px] font-bold leading-tight sm:text-[26px]',
          VALUE_TONES[tone],
          wrap ? 'break-words text-[16px] sm:text-[20px]' : 'truncate',
        )}
      >
        {value}
      </p>
      {caption ? <p className="truncate text-[11px] text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

export function InsightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 rounded-[14px] border border-border bg-card p-4 sm:p-[18px]', cardShadow)}>
      <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
      <div className="text-[12px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function ActionLoading({ label }: { label: string }) {
  return (
    <div
      className={cn('flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-12', cardShadow)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <span className="font-mono text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function ActionError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive" role="alert">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={cn(actionPrimaryBtnClass, 'mt-3 w-auto')}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function ActionEmpty({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={cn('space-y-3 rounded-xl border border-border bg-card p-10 text-center', cardShadow)}>
      {Icon ? <Icon className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /> : null}
      <p className="text-base font-bold text-foreground">{title}</p>
      <p className="mx-auto max-w-md text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={cn(actionPrimaryBtnClass, 'mt-2 inline-flex')}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
