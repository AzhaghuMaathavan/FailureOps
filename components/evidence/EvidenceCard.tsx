'use client';

import React from 'react';
import { EvidenceItem } from '@/types';
import { FileText, ChevronRight, Hash, Clock, CheckCircle } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  onSelect: (evidence: EvidenceItem) => void;
  isSelected?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onSelect,
  isSelected = false,
}) => {
  const getSourceIconColor = () => {
    switch (evidence.sourceType) {
      case 'PRODUCT_METRICS':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'CUSTOMER_FEEDBACK':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'ENGINEERING_METRICS':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'TEAM_OPERATIONS':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-primary bg-primary/10 border-primary/30';
    }
  };

  return (
    <div
      onClick={() => onSelect(evidence)}
      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-card border-primary ring-1 ring-primary/40 shadow-[0_0_15px_-4px_rgba(255,122,0,0.25)]'
          : 'bg-card/70 border-border/80 hover:border-primary/40 hover:bg-card-hover'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold border ${getSourceIconColor()}`}>
            {evidence.sourceType.replace('_', ' ')}
          </span>
          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 truncate max-w-[160px]">
            <FileText className="w-3 h-3 shrink-0" />
            {evidence.sourceFile}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          <span>{evidence.confidence}% Match</span>
        </div>
      </div>

      <p className="text-sm font-medium text-foreground leading-relaxed line-clamp-2">
        &ldquo;{evidence.content}&rdquo;
      </p>

      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-mono">
            <Hash className="w-3 h-3 opacity-60" />
            {evidence.reference}
          </span>
          <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono">
            <Clock className="w-3 h-3 opacity-60" />
            {evidence.timestamp}
          </span>
        </div>

        <span className="flex items-center gap-0.5 text-xs text-primary font-medium group-hover:translate-x-0.5 transition-transform">
          Context
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
