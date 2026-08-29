import React from 'react';
import { RiskLevel } from '@/types';
import { AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export type ExtendedRiskLevel = RiskLevel | 'AT_RISK' | 'HIGH' | 'MEDIUM' | 'LOW';

interface RiskBadgeProps {
  level: ExtendedRiskLevel;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  const configs: Record<ExtendedRiskLevel, { label: string; icon: any; color: string; dot: string }> = {
    HEALTHY: {
      label: 'HEALTHY',
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    LOW: {
      label: 'LOW RISK',
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    MEDIUM: {
      label: 'MEDIUM',
      icon: AlertTriangle,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500',
    },
    WARNING: {
      label: 'WARNING',
      icon: AlertTriangle,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500',
    },
    AT_RISK: {
      label: 'AT RISK',
      icon: AlertTriangle,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500 animate-pulse',
    },
    HIGH: {
      label: 'HIGH RISK',
      icon: AlertOctagon,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500 animate-pulse',
    },
    CRITICAL: {
      label: 'CRITICAL',
      icon: AlertOctagon,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500 animate-pulse',
    },
  };

  const config = configs[level] || configs.WARNING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};
