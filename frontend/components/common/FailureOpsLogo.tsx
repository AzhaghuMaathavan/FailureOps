'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FailureOpsLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const FailureOpsLogo: React.FC<FailureOpsLogoProps> = ({
  size = 32,
  className = '',
  glow = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-transform duration-200 hover:scale-105',
        glow && 'drop-shadow-[0_0_12px_rgba(255,122,0,0.45)]',
        className
      )}
      aria-label="FailureOps X Logo"
    >
      <defs>
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <linearGradient id="fx-ember-bright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="25%" stopColor="#FFB300" />
          <stop offset="50%" stopColor="#FF7A00" />
          <stop offset="75%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#992000" />
        </linearGradient>

        <linearGradient id="fx-ember-bevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#FFE082" />
          <stop offset="70%" stopColor="#FF8F00" />
          <stop offset="100%" stopColor="#BF360C" />
        </linearGradient>

        <linearGradient id="fx-ember-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9800" />
          <stop offset="50%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#5D1200" />
        </linearGradient>

        <linearGradient id="fx-orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE57F" />
          <stop offset="40%" stopColor="#FF7A00" />
          <stop offset="80%" stopColor="#D84315" />
          <stop offset="100%" stopColor="#4E0D00" />
        </linearGradient>

        <radialGradient id="fx-node-1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#FFD54F" />
          <stop offset="70%" stopColor="#FF6D00" />
          <stop offset="100%" stopColor="#4E0D00" />
        </radialGradient>

        <radialGradient id="fx-node-2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#FFB74D" />
          <stop offset="70%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#3E0800" />
        </radialGradient>
      </defs>

      <g>
        {/* Orbital Precision Ring */}
        <path
          d="M 125 76 C 240 18, 380 40, 424 95 C 448 126, 460 170, 464 218 L 440 216 C 436 174, 426 137, 404 110 C 366 62, 245 42, 137 93 Z"
          fill="url(#fx-orbit-grad)"
        />
        <path
          d="M 72 148 C 42 205, 38 275, 62 334 C 74 362, 92 388, 116 410 L 98 426 C 70 400, 50 370, 36 338 C 10 270, 15 190, 50 128 Z"
          fill="url(#fx-orbit-grad)"
        />
        <path
          d="M 154 442 C 240 482, 332 470, 362 426 L 382 438 C 344 492, 238 506, 142 460 Z"
          fill="url(#fx-orbit-grad)"
        />

        {/* Orbit Telemetry Spheres */}
        <circle cx="410" cy="70" r="24" fill="url(#fx-node-1)" filter="url(#logo-glow)" />
        <circle cx="128" cy="442" r="26" fill="url(#fx-node-2)" filter="url(#logo-glow)" />

        {/* Central Master Futuristic 'X' */}
        <path
          d="M 36 86 L 180 86 L 272 256 L 180 406 L 64 406 L 174 256 Z"
          fill="url(#fx-ember-bright)"
          stroke="#3d0a00"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M 42 92 L 172 92 L 254 256 L 172 398 L 76 398 L 164 256 Z"
          fill="url(#fx-ember-bevel)"
          opacity="0.85"
        />

        {/* Top-Right Blade */}
        <path
          d="M 346 112 L 442 112 L 284 256 L 244 220 Z"
          fill="url(#fx-ember-bright)"
          stroke="#3d0a00"
          strokeWidth="3"
        />
        <path
          d="M 352 118 L 430 118 L 288 250 L 256 222 Z"
          fill="url(#fx-ember-bevel)"
          opacity="0.9"
        />

        {/* Bottom-Right Blade */}
        <path
          d="M 284 256 L 476 436 L 372 436 L 222 296 Z"
          fill="url(#fx-ember-bright)"
          stroke="#3d0a00"
          strokeWidth="3"
        />
        <path
          d="M 292 262 L 460 428 L 380 428 L 236 296 Z"
          fill="url(#fx-ember-bevel)"
          opacity="0.85"
        />

        {/* Core Intersection Node */}
        <polygon points="230,256 272,220 286,256 244,292" fill="url(#fx-ember-dark)" />
      </g>
    </svg>
  );
};
