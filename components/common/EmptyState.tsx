import React from 'react';
import { LucideIcon, Database } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Database,
  actionText,
  actionHref,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 my-6">
      <div className="w-14 h-14 rounded-2xl bg-surface-feed border border-border flex items-center justify-center text-primary mb-4 shadow-sm">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mt-1.5 leading-relaxed">{description}</p>
      
      {(actionText && (actionHref || onAction)) && (
        <div className="mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              {actionText}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
