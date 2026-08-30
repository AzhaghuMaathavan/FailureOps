'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { FxMark, btnPrimary, focusRing } from '@/components/landing/chrome';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useApp();

  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) {
      setEmail(qEmail);
    } else {
      setEmail('lead.architect@aurora.tech');
    }

    const devCode = searchParams.get('code');
    if (devCode && devCode.length === 6) {
      setDigits(devCode.split(''));
    }
  }, [searchParams]);

  // Countdown timer for expiry
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const cd = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(cd);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    // Handle pasted content
    if (value.length > 1) {
      const clean = value.replace(/[^0-9]/g, '').slice(0, 6);
      if (clean) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = clean[i] || '';
        }
        setDigits(newDigits);
        const nextIdx = Math.min(clean.length, 5);
        inputRefs.current[nextIdx]?.focus();
      }
      return;
    }

    const singleDigit = value.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient.verifyEmail(email, code);
      setSuccessMsg('Account verified successfully! Initializing workspace...');
      await refreshUser();
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient.resendVerification(email);
      setSuccessMsg('A fresh 6-digit verification code has been dispatched to your email.');
      setCooldown(45); // 45s cooldown
      setTimeLeft(15 * 60);
      if (res?.devVerificationCode) {
        console.log('[Dev Verification Code]:', res.devVerificationCode);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex justify-center mb-2">
                <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-primary-glow">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Verify Your Account
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                We sent a 6-digit verification code to
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-feed border border-border text-xs font-mono font-semibold text-primary">
                <Mail className="w-3.5 h-3.5" />
                <span>{email}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              {/* 6 OTP Boxes */}
              <div className="flex justify-between gap-2 sm:gap-3">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={idx === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={cn(
                      'w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold bg-surface-feed border border-border rounded-xl text-foreground outline-none transition-all',
                      digit ? 'border-primary shadow-primary-glow bg-primary/5 text-primary' : '',
                      focusRing
                    )}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {/* Time Remaining */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Code expires in:
                </span>
                <span className={cn('font-bold', timeLeft < 120 ? 'text-destructive' : 'text-foreground')}>
                  {formattedTime}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || digits.join('').length !== 6}
                className={cn(btnPrimary('w-full py-3.5 text-sm font-bold justify-center'))}
              >
                {loading ? 'Verifying...' : 'Verify & Launch Workspace'}
                {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </button>
            </form>

            <div className="pt-4 border-t border-border/60 flex flex-col items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className={cn(
                    'font-bold transition-colors cursor-pointer inline-flex items-center gap-1',
                    cooldown > 0
                      ? 'text-muted-foreground cursor-not-allowed opacity-60'
                      : 'text-primary hover:text-primary-hover'
                  )}
                >
                  <RefreshCw className={cn('w-3 h-3', resending && 'animate-spin')} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>

              <Link href="/login" className="text-muted-foreground hover:text-foreground text-[11px] transition-colors">
                Back to Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full size-8 border-t-2 border-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
