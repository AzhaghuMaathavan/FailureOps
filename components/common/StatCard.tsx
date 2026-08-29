import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  isRiskTrend?: boolean;
  subtext?: string;
  icon?: LucideIcon;
  accentColor?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  isRiskTrend = false,
  subtext,
  icon: Icon,
  accentColor,
  badge,
  onClick,
  className = '',
}) => {
  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    if (isRiskTrend) {
      // For risk: UP is dangerous (red), DOWN is good (green)
      if (trendDirection === 'up') return 'text-rose-400';
      if (trendDirection === 'down') return 'text-emerald-400';
    } else {
      // Normal metric: UP is good (green), DOWN is bad (red)
      if (trendDirection === 'up') return 'text-emerald-400';
      if (trendDirection === 'down') return 'text-rose-400';
    }
    return 'text-muted-foreground';
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-5 rounded-xl bg-card border border-border/70 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-primary/40 hover:bg-card-hover hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/80 to-primary/10" />
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg bg-surface-feed border border-border/60 ${accentColor || 'text-primary'}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
          {value}
        </span>
        {badge}
      </div>

      {(trend || subtext) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span className={`font-semibold flex items-center gap-0.5 ${getTrendColor()}`}>
              {trend}
            </span>
          )}
          {subtext && <span className="text-muted-foreground truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
