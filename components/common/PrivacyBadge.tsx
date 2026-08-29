import React from 'react';
import { PrivacyLevel } from '@/types';
import { Lock, Users, ShieldAlert, Globe } from 'lucide-react';

interface PrivacyBadgeProps {
  level: PrivacyLevel;
  showDescription?: boolean;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ level, showDescription = false }) => {
  const configs = {
    PRIVATE: {
      label: 'PRIVATE',
      icon: Lock,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      description: 'Only authorized members of this project can access raw source evidence.',
    },
    ORGANIZATION: {
      label: 'ORGANIZATION',
      icon: Users,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      description: 'Available to all verified members across the enterprise organization.',
    },
    ANONYMOUS_LEARNING: {
      label: 'ANONYMOUS LEARNING',
      icon: ShieldAlert,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      description: 'FailureOps learns anonymized patterns without exposing source files or identity.',
    },
    PUBLIC: {
      label: 'PUBLIC CASE',
      icon: Globe,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      description: 'Case study explicitly designated as public institutional reference.',
    },
    PUBLIC_CASE_STUDY: {
      label: 'PUBLIC CASE',
      icon: Globe,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      description: 'Case study explicitly designated as public institutional reference.',
    },
  };


  const config = configs[level] || configs.PRIVATE;
  const Icon = config.icon;

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider uppercase border ${config.color}`}
        title={config.description}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
      {showDescription && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{config.description}</p>
      )}
    </div>
  );
};
