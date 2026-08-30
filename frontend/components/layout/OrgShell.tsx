'use client';

import React from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';

const cardShadow =
  'shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]';

export const orgPrimaryBtnClass =
  'inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50';

export const orgSecondaryBtnClass =
  'inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-[10px] border border-border bg-surface-feed px-4 py-2.5 text-xs font-bold text-foreground transition-colors duration-200 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none';

export function OrgShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto scroll-pt-16 px-4 pb-10 pt-7 sm:px-6 lg:px-7">
          <div className="flex w-full flex-col gap-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function OrgPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.66px] text-primary">
          {eyebrow}
        </p>
        <h1 className="text-[22px] font-extrabold tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        <p className="max-w-xl text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function OrgMetricCard({
  label,
  value,
  hint,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-4 ${cardShadow}`}
    >
      <p className="font-mono text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className={`truncate font-mono text-[22px] font-bold leading-none sm:text-[26px] ${valueClassName}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function OrgInsightCard({
  title,
  body,
  footer,
  href,
  onClick,
}: {
  title: string;
  body: string;
  footer?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className = `flex min-w-0 flex-col gap-2 rounded-[14px] border border-border bg-card p-[18px] ${cardShadow} ${
    href || onClick
      ? 'cursor-pointer transition-colors duration-200 hover:border-primary/50 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none'
      : ''
  }`;

  const content = (
    <>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
      {footer}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} text-left`}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function OrgStatusPill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'critical' | 'watch' | 'success' | 'default';
}) {
  const tones = {
    critical: 'border-destructive text-destructive',
    watch: 'border-warning text-warning',
    success: 'border-success text-success',
    default: 'border-border text-muted-foreground',
  };
  return (
    <span
      className={`inline-flex items-start rounded-full border bg-surface-feed px-2 py-1 font-mono text-[10px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
