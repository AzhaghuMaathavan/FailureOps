'use client';

import React from 'react';
import Link from 'next/link';

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
  const dimensions = {
    xs: { mark: 20, type: 'text-[9px]', markType: 'text-[7px]', subtext: 'text-[8px]', radius: 'rounded-md' },
    sm: { mark: 24, type: 'text-[10px]', markType: 'text-[8px]', subtext: 'text-[8px]', radius: 'rounded-md' },
    md: { mark: 28, type: 'text-[11px]', markType: 'text-[10px]', subtext: 'text-[9px]', radius: 'rounded-lg' },
    lg: { mark: 32, type: 'text-[13px]', markType: 'text-[12px]', subtext: 'text-[9px]', radius: 'rounded-[10px]' },
    xl: { mark: 40, type: 'text-lg', markType: 'text-sm', subtext: 'text-xs', radius: 'rounded-xl' },
  }[size];

  const mark = (
    <div
      className={`relative shrink-0 flex items-center justify-center bg-primary text-primary-foreground font-mono font-bold leading-none ${dimensions.radius} ${dimensions.markType} ${
        glow ? 'shadow-primary-glow' : ''
      }`}
      style={{ width: dimensions.mark, height: dimensions.mark }}
      aria-hidden="true"
    >
      FX
    </div>
  );

  const content = (
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {mark}

      {variant === 'full' && (
        <div className="flex flex-col text-left min-w-0">
          <span className={`font-mono font-bold tracking-wide text-foreground leading-none whitespace-nowrap ${dimensions.type}`}>
            FAILUREOPS X
          </span>
          <span className={`font-medium text-muted-foreground leading-tight mt-px whitespace-nowrap ${dimensions.subtext}`}>
            Early-warning intel
          </span>
        </div>
      )}

      {variant === 'badge' && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-muted border border-primary/40">
          <span className="font-mono font-bold text-foreground text-xs whitespace-nowrap">
            FAILUREOPS <span className="text-primary">X</span>
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="FailureOps X home"
        className="inline-flex cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
      >
        {content}
      </Link>
    );
  }

  if (variant === 'icon') {
    return (
      <div className={className} role="img" aria-label="FailureOps X">
        {mark}
      </div>
    );
  }

  return content;
};
