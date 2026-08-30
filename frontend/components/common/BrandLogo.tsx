'use client';

import React from 'react';
import Link from 'next/link';
import { FailureOpsLogo } from './FailureOpsLogo';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  href?: string;
  className?: string;
  glow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  href,
  className = '',
  glow = true,
}) => {
  const pixelSizes = {
    xs: 22,
    sm: 26,
    md: 32,
    lg: 38,
    xl: 48,
  };

  const textSizes = {
    xs: { title: 'text-xs', subtitle: 'text-[9px]' },
    sm: { title: 'text-sm', subtitle: 'text-[10px]' },
    md: { title: 'text-base', subtitle: 'text-xs' },
    lg: { title: 'text-lg', subtitle: 'text-xs' },
    xl: { title: 'text-xl', subtitle: 'text-sm' },
  }[size];

  const logoIcon = (
    <FailureOpsLogo
      size={pixelSizes[size]}
      glow={glow}
      className="shrink-0 transition-transform duration-200 group-hover:scale-105"
    />
  );

  const content = (
    <div className={cn('inline-flex items-center gap-3 select-none group', className)}>
      {logoIcon}

      {variant === 'full' && (
        <div className="flex flex-col text-left leading-tight min-w-0">
          <span className={cn('font-mono font-bold tracking-tight text-foreground', textSizes.title)}>
            FAILUREOPS <span className="text-primary font-black">X</span>
          </span>
          <span className={cn('text-muted-foreground font-medium uppercase tracking-wider', textSizes.subtitle)}>
            Project Failure Intelligence
          </span>
        </div>
      )}

      {variant === 'badge' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          <span className="font-mono font-bold text-foreground text-xs whitespace-nowrap">
            FAILUREOPS <span className="text-primary font-black">X</span>
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="FailureOps X Home"
        className="inline-flex cursor-pointer rounded-lg p-1 -ml-1 transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {content}
      </Link>
    );
  }

  if (variant === 'icon') {
    return (
      <div className={className} role="img" aria-label="FailureOps X">
        {logoIcon}
      </div>
    );
  }

  return content;
};
