'use client';

import React from 'react';
import { OrganizationalMemoryEntry } from '@/types';
import { Database, Tag, CheckCircle2, ArrowUpRight, Sparkles, Building2 } from 'lucide-react';

interface MemoryCardProps {
  entry: OrganizationalMemoryEntry;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ entry }) => {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md hover:border-primary/40 transition-all duration-200 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">{entry.pattern}</h4>
            <span className="text-[10px] font-mono text-muted-foreground">ID: {entry.id} • Verified on {entry.verifiedAt}</span>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          {entry.confidence}% Confidence
        </span>
      </div>

      {/* Context info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        <span>{entry.context?.industry || 'Cross-Industry'}</span>
        <span>•</span>
        <span>{entry.context?.stage || 'Validated'}</span>
        <span>•</span>
        <span>{entry.context?.targetMarket || 'Organization'}</span>
      </div>

      {/* Intervention & Outcome grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-surface-feed/70 border border-border/60">
          <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
            Verified Intervention
          </span>
          <p className="text-foreground font-medium leading-relaxed">{entry.intervention}</p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold block mb-1">
            Empirical Outcome Lift
          </span>
          <p className="text-foreground font-semibold leading-relaxed">{entry.outcome}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
        <Tag className="w-3 h-3 text-muted-foreground mr-1" />
        {(entry.tags || []).map(tag => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-md bg-surface-feed border border-border/70 text-[10px] font-mono text-muted-foreground"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};
