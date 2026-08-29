import React from 'react';
import { RiskLevel } from '@/types';
import { AlertTriangle, AlertOctagon, CheckCircle2, type LucideIcon } from 'lucide-react';

export type ExtendedRiskLevel = RiskLevel | 'AT_RISK' | 'HIGH' | 'MEDIUM' | 'LOW';

interface RiskBadgeProps {
  level: ExtendedRiskLevel;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  const configs: Record<ExtendedRiskLevel, { label: string; icon: LucideIcon; color: string }> = {
    HEALTHY: {
      label: 'HEALTHY',
      icon: CheckCircle2,
      color: 'bg-surface-feed text-success border-success',
    },
    LOW: {
      label: 'LOW RISK',
      icon: CheckCircle2,
      color: 'bg-surface-feed text-success border-success',
    },
    MEDIUM: {
      label: 'MEDIUM',
      icon: AlertTriangle,
      color: 'bg-surface-feed text-warning border-warning',
    },
    WARNING: {
      label: 'WARNING',
      icon: AlertTriangle,
      color: 'bg-surface-feed text-warning border-warning',
    },
    AT_RISK: {
      label: 'AT RISK',
      icon: AlertTriangle,
      color: 'bg-surface-feed text-warning border-warning',
    },
    HIGH: {
      label: 'HIGH RISK',
      icon: AlertOctagon,
      color: 'bg-surface-feed text-destructive border-destructive',
    },
    CRITICAL: {
      label: 'CRITICAL',
      icon: AlertOctagon,
      color: 'bg-surface-feed text-destructive border-destructive',
    },
  };

  const config = configs[level] || configs.WARNING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono font-medium leading-none border whitespace-nowrap ${config.color} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
};
