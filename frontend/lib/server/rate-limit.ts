import 'server-only';
import { NextRequest } from 'next/server';
import { serverConfig } from './config';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory token bucket rate limit store (isolated to server runtime)
const rateLimitStore = new Map<string, RateLimitRecord>();

export type RateLimitTier = 'general' | 'status' | 'search' | 'analysis' | 'upload';


export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export function checkRateLimit(req: NextRequest, tier: RateLimitTier = 'general'): RateLimitResult {
  // Extract client identifier (IP or fallback to forwarded header, never trusted for auth, only for volumetric throttling)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const key = `${tier}:${clientIp}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  const limit = serverConfig.rateLimits[tier] || 60;
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    // New rate limit window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetSeconds: 60,
    };
  }

  if (existing.count >= limit) {
    const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  existing.count++;
  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    resetSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}
