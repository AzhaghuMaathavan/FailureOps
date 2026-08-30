'use client';

import React from 'react';
import { OrganizationalMemoryEntry } from '@/types';
import { Database, Tag, Building2 } from 'lucide-react';

interface MemoryCardProps {
  entry: OrganizationalMemoryEntry;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ entry }) => {
  return (
    <article className="space-y-4 rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Database className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{entry.pattern}</h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              ID: {entry.id} • Verified on {entry.verifiedAt}
            </span>
          </div>
        </div>

        <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-success">
          {entry.confidence}% Confidence
        </span>
      </div>

      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span>{entry.context?.industry || 'Cross-Industry'}</span>
        <span>•</span>
        <span>{entry.context?.stage || 'Validated'}</span>
        <span>•</span>
        <span>{entry.context?.targetMarket || 'Organization'}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-surface-feed/70 p-3">
          <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
            Verified intervention
          </span>
          <p className="font-medium leading-relaxed text-foreground">{entry.intervention}</p>
        </div>

        <div className="rounded-xl border border-success/30 bg-success/5 p-3">
          <span className="mb-1 block font-mono text-[10px] font-semibold uppercase text-success">
            Empirical outcome lift
          </span>
          <p className="font-semibold leading-relaxed text-foreground">{entry.outcome}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
        <Tag className="mr-1 h-3 w-3 text-muted-foreground" aria-hidden="true" />
        {(entry.tags || []).map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-border/70 bg-surface-feed px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
};
