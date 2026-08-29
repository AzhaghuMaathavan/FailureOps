import React from 'react';
import { PrivacyLevel } from '@/types';
import { Lock, Users, ShieldAlert, Globe, type LucideIcon } from 'lucide-react';

interface PrivacyBadgeProps {
  level: PrivacyLevel;
  showDescription?: boolean;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ level, showDescription = false }) => {
  const configs: Record<
    PrivacyLevel,
    { label: string; icon: LucideIcon; color: string; description: string }
  > = {
    PRIVATE: {
      label: 'PRIVATE',
      icon: Lock,
      color: 'bg-surface-feed text-success border-success',
      description: 'Only authorized members of this project can access raw source evidence.',
    },
    ORGANIZATION: {
      label: 'ORGANIZATION',
      icon: Users,
      color: 'bg-surface-feed text-info border-info',
      description: 'Available to all verified members across the enterprise organization.',
    },
    ANONYMOUS_LEARNING: {
      label: 'ANONYMOUS LEARNING',
      icon: ShieldAlert,
      color: 'bg-surface-feed text-magic border-magic',
      description: 'FailureOps learns anonymized patterns without exposing source files or identity.',
    },
    PUBLIC: {
      label: 'PUBLIC CASE',
      icon: Globe,
      color: 'bg-surface-feed text-info border-info',
      description: 'Case study explicitly designated as public institutional reference.',
    },
    PUBLIC_CASE_STUDY: {
      label: 'PUBLIC CASE',
      icon: Globe,
      color: 'bg-surface-feed text-info border-info',
      description: 'Case study explicitly designated as public institutional reference.',
    },
  };

  const config = configs[level] || configs.PRIVATE;
  const Icon = config.icon;

  return (
    <div className="inline-flex flex-col gap-1 min-w-0">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono font-medium leading-none tracking-wide uppercase border whitespace-nowrap ${config.color}`}
        title={config.description}
      >
        <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
        {config.label}
      </span>
      {showDescription && (
        <p className="text-[11px] text-subtle mt-0.5">{config.description}</p>
      )}
    </div>
  );
};
