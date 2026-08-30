'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { FxMark, btnPrimary, focusRing } from '@/components/landing/chrome';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useApp();

  const [email, setEmail] = useState('lead.architect@aurora.tech');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessBanner('Your password has been successfully reset. Please sign in with your new credentials.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.login(email, password);

      if (res?.requiresVerification) {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }

      await refreshUser();
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Check your email and password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Card Box */}
          <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex justify-center mb-2">
                <FxMark />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Continue to your workspace.
              </p>
            </div>

            {successBanner && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successBanner}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Work Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none disabled:opacity-60',
                      focusRing
                    )}
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:text-primary-hover transition-colors font-medium cursor-pointer"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-foreground outline-none disabled:opacity-60',
                      focusRing
                    )}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(btnPrimary('w-full py-3.5 text-sm font-bold justify-center mt-2 disabled:opacity-60 cursor-pointer'))}
              >
                {loading ? 'Signing you in...' : 'Sign in'}
                {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </button>
            </form>

            <div className="pt-4 border-t border-border/60 text-center space-y-2 text-xs text-muted-foreground">
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary hover:text-primary-hover font-bold transition-colors">
                  Create workspace
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full size-8 border-t-2 border-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
