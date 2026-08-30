'use client';

import React from 'react';
import { HelpCircle, BookOpen, AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { CommunityPostType } from '@/types';

interface PostTypeBadgeProps {
  type: CommunityPostType | string;
  size?: 'sm' | 'md';
}

export const PostTypeBadge: React.FC<PostTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const normalized = (type || 'DISCUSSION').toUpperCase();

  const config = {
    QUESTION: {
      label: 'Question',
      icon: HelpCircle,
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    LESSON: {
      label: 'Lesson Learned',
      icon: BookOpen,
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    FAILURE_REPORT: {
      label: 'Failure Report',
      icon: AlertTriangle,
      className: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    },
    RECOVERY: {
      label: 'Recovery Strategy',
      icon: RefreshCw,
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    DISCUSSION: {
      label: 'Discussion',
      icon: MessageSquare,
      className: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    },
  }[normalized] || {
    label: normalized,
    icon: MessageSquare,
    className: 'bg-muted/40 text-muted-foreground border-border',
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.className} ${
        isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
