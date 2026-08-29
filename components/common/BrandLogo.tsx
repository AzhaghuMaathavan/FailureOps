'use client';

import React from 'react';
import Image from 'next/image';
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
    xs: { icon: 20, text: 'text-xs', subtext: 'text-[8px]', box: 'w-5 h-5' },
    sm: { icon: 28, text: 'text-sm', subtext: 'text-[9px]', box: 'w-7 h-7' },
    md: { icon: 34, text: 'text-base', subtext: 'text-[10px]', box: 'w-8.5 h-8.5' },
    lg: { icon: 44, text: 'text-xl', subtext: 'text-xs', box: 'w-11 h-11' },
    xl: { icon: 64, text: 'text-3xl', subtext: 'text-sm', box: 'w-16 h-16' },
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Icon Image with Dynamic Amber/Gold Glow */}
      <div
        className={`relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
          glow ? 'drop-shadow-[0_0_12px_rgba(255,122,0,0.45)]' : ''
        }`}
        style={{ width: dimensions.icon, height: dimensions.icon }}
      >
        <img
          src="/logo.png"
          alt="FailureOps X Logo"
          width={dimensions.icon}
          height={dimensions.icon}
          className="w-full h-full object-contain"
        />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1 leading-none">
            <span className={`font-mono font-extrabold tracking-wider text-foreground ${dimensions.text}`}>
              FAILUREOPS
            </span>
            <span className={`font-mono font-black text-primary ${dimensions.text}`}>
              X
            </span>
          </div>
          <span className={`uppercase tracking-widest text-muted-foreground font-semibold font-mono mt-0.5 ${dimensions.subtext}`}>
            Early-Warning Intel
          </span>
        </div>
      )}

      {variant === 'badge' && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
          <span className="font-mono font-bold text-foreground text-xs">
            FAILUREOPS <span className="text-primary font-black">X</span>
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
};
