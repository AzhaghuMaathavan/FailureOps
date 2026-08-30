'use client';

import React from 'react';

interface KpiStatProps {
  label: string;
  value: string | number;
  hint: string;
  valueClassName?: string;
}

export function KpiStat({
  label,
  value,
  hint,
  valueClassName = 'text-foreground',
}: KpiStatProps) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
      <p className="text-[10px] font-mono font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1.5 truncate font-mono text-[22px] font-bold sm:text-[26px] ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
