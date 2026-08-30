'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, Building2, ArrowRight, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { FxMark, btnPrimary, focusRing } from '@/components/landing/chrome';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !organization) {
      setError('Please fill in all required fields to create your workspace.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Simulate workspace initialization
      await new Promise((resolve) => setTimeout(resolve, 400));
      router.push('/register');
    } catch (err) {
      setError('Failed to create workspace. Please try again.');
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
                <FxMark />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Create your workspace
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Deploy private intelligence enclaves for your engineering organization
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Your Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none',
                      focusRing
                    )}
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

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
                  Organization Name
                </label>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none',
                      focusRing
                    )}
                    placeholder="Acme Technologies Inc."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      'w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none',
                      focusRing
                    )}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(btnPrimary('w-full py-3.5 text-sm font-bold justify-center mt-2'))}
              >
                {loading ? 'Creating Workspace...' : 'Create Workspace'}
                {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </button>
            </form>

            <div className="pt-4 border-t border-border/60 text-center space-y-2 text-xs text-muted-foreground">
              <p>
                Already have a workspace?{' '}
                <Link href="/login" className="text-primary hover:text-primary-hover font-bold transition-colors">
                  Sign in
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
