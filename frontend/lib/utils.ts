import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getRiskColorClass(level: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'AT_RISK'): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (level) {
    case 'HEALTHY':
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        text: 'text-emerald-500 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
    case 'WARNING':
    case 'AT_RISK':
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        text: 'text-amber-500 dark:text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
      };
    case 'CRITICAL':
      return {
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        text: 'text-rose-500 dark:text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-500',
      };
    default:
      return {
        bg: 'bg-slate-500/10 dark:bg-slate-500/15',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        dot: 'bg-slate-400',
      };
  }
}
