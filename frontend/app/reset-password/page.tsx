'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { FxMark, btnPrimary, focusRing } from '@/components/landing/chrome';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  // Password strength calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strengthCount = [hasMinLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !newPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (code.trim().length !== 6) {
      setError('Please enter the valid 6-digit recovery PIN.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.resetPassword(email, code, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please verify your PIN and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex justify-center mb-2">
                <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-primary-glow">
                  <Lock className="w-6 h-6" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Set New Password
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Enter your 6-digit recovery PIN and choose a strong new password
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Password reset successful! Redirecting to login...</span>
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
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none',
                      focusRing
                    )}
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  6-Digit Recovery PIN
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-bold tracking-widest text-foreground outline-none',
                      focusRing
                    )}
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-foreground outline-none',
                      focusRing
                    )}
                    placeholder="Minimum 8 characters"
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

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            'flex-1 rounded-full transition-all duration-300',
                            strengthCount >= step
                              ? strengthCount <= 2
                                ? 'bg-amber-500'
                                : strengthCount === 3
                                ? 'bg-primary'
                                : 'bg-success'
                              : 'bg-border'
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Strength: {strengthCount <= 2 ? 'Weak' : strengthCount === 3 ? 'Good' : 'Strong'}</span>
                      <span>8+ chars, upper, number, symbol</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none',
                      focusRing
                    )}
                    placeholder="Confirm matching password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className={cn(btnPrimary('w-full py-3.5 text-sm font-bold justify-center mt-2'))}
              >
                {loading ? 'Updating Password...' : 'Save New Password & Sign in'}
                {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </button>
            </form>

            <div className="pt-4 border-t border-border/60 text-center space-y-2 text-xs text-muted-foreground">
              <Link href="/login" className="text-primary hover:text-primary-hover font-bold transition-colors">
                Cancel and return to Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full size-8 border-t-2 border-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
