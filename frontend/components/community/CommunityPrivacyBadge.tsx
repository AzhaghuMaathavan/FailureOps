'use client';

import React from 'react';
import { Lock, Building2, Globe, Sparkles } from 'lucide-react';
import { CommunityVisibility } from '@/types';

interface CommunityPrivacyBadgeProps {
  visibility: CommunityVisibility | string;
}

export const CommunityPrivacyBadge: React.FC<CommunityPrivacyBadgeProps> = ({ visibility }) => {
  const norm = (visibility || 'PRIVATE').toUpperCase();

  const config = {
    PRIVATE: {
      label: 'Private (Enclave Only)',
      icon: Lock,
      className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    },
    ORGANIZATION: {
      label: 'Organization Internal',
      icon: Building2,
      className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    },
    COMMUNITY: {
      label: 'FailureOps Community',
      icon: Globe,
      className: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    },
    GLOBAL_SANITIZED: {
      label: 'Global Sanitized Intelligence',
      icon: Sparkles,
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
  }[norm] || {
    label: norm,
    icon: Lock,
    className: 'bg-muted/40 text-muted-foreground border-border',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${config.className}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
