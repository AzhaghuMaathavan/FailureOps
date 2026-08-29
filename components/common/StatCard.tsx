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
    if (!trend) return 'text-subtle';
    if (isRiskTrend) {
      if (trendDirection === 'up') return 'text-destructive';
      if (trendDirection === 'down') return 'text-success';
    } else {
      if (trendDirection === 'up') return 'text-success';
      if (trendDirection === 'down') return 'text-destructive';
    }
    return 'text-subtle';
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative p-4 rounded-xl bg-card border border-border shadow-card transition-colors duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-primary/50 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono font-medium text-muted-foreground whitespace-nowrap">
          {label}
        </span>
        {Icon && (
          <div
            className={`p-1.5 rounded-lg bg-surface-feed border border-border shrink-0 ${accentColor || 'text-primary'}`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-1.5 flex items-baseline gap-2 min-w-0">
        <span
          className={`text-[26px] leading-none font-bold tracking-tight font-mono ${accentColor || 'text-foreground'}`}
        >
          {value}
        </span>
        {badge}
      </div>

      {(trend || subtext) && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] min-w-0">
          {trend && (
            <span className={`font-medium flex items-center gap-0.5 whitespace-nowrap ${getTrendColor()}`}>
              {trend}
            </span>
          )}
          {subtext && <span className="text-subtle truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
