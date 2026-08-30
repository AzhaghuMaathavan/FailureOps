'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  ShieldCheck,
  Lock,
  Building2,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Sparkles,
  Save,
  Laptop,
  Globe,
  Bell,
  Fingerprint,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  OrgInsightCard,
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  orgPrimaryBtnClass,
  orgSecondaryBtnClass,
} from '@/components/layout/OrgShell';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, setUser, refreshUser, logout, project } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'organization' | 'privacy' | 'audit'>('profile');

  // Form states for general profile
  const [name, setName] = useState(user?.name || 'Lead Intelligence Architect');
  const [title, setTitle] = useState(user?.title || 'Principal Enclave Architect');
  const [organizationName, setOrganizationName] = useState(user?.organizationName || 'Aurora Technologies');
  const [bio, setBio] = useState(
    user?.bio ||
      'Leading failure intelligence, root cause analysis, and multi-tenant reasoning pipelines across Aurora distributed services.'
  );

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [twoFactor, setTwoFactor] = useState(user?.twoFactorEnabled || false);

  // Privacy & notifications states
  const [emailAlerts, setEmailAlerts] = useState(user?.notifications?.emailAlerts ?? true);
  const [sev1Immediate, setSev1Immediate] = useState(user?.notifications?.sev1Immediate ?? true);
  const [weeklyDigest, setWeeklyDigest] = useState(user?.notifications?.weeklyDigest ?? true);
  const [learningShareApproved, setLearningShareApproved] = useState(
    user?.notifications?.learningShareApproved ?? true
  );

  // UI status feedback
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTitle(user.title || 'Principal Enclave Architect');
      setOrganizationName(user.organizationName);
      setBio(user.bio || '');
      setTwoFactor(user.twoFactorEnabled);
      if (user.notifications) {
        setEmailAlerts(user.notifications.emailAlerts);
        setSev1Immediate(user.notifications.sev1Immediate);
        setWeeklyDigest(user.notifications.weeklyDigest);
        setLearningShareApproved(user.notifications.learningShareApproved);
      }
    }
  }, [user]);

  const initials = (name || 'FX')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await apiClient.updateProfile({
        name,
        title,
        organizationName,
        bio,
        twoFactorEnabled: twoFactor,
        notifications: {
          emailAlerts,
          sev1Immediate,
          weeklyDigest,
          learningShareApproved,
        },
      });

      if (res?.profile) {
        setUser(res.profile);
      }
      setSaveStatus({ type: 'success', message: 'Profile details successfully updated and synchronized.' });
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPassStatus({ type: 'error', message: 'Please enter your current and new password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPassStatus({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setChangingPass(true);
    setPassStatus(null);

    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setPassStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassStatus({ type: 'error', message: err?.message || 'Failed to change password.' });
    } finally {
      setChangingPass(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Identity & Details', icon: User },
    { id: 'security', label: 'Security & Credentials', icon: Lock },
    { id: 'organization', label: 'Organization & Enclave', icon: Building2 },
    { id: 'privacy', label: 'Notifications & Privacy', icon: Shield },
    { id: 'audit', label: 'Audit Activity', icon: Clock },
  ];

  return (
    <OrgShell>
      <div className="space-y-6">
        <OrgPageHeader
          eyebrow="USER PROFILE & IDENTITY"
          title="Account Management"
          description="Configure your intelligence identity, access credentials, tenant enclave settings, and privacy permissions."
        />

        {/* Hero Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative">
              <div className="size-16 sm:size-20 rounded-2xl bg-primary text-primary-foreground font-mono text-2xl font-extrabold flex items-center justify-center shadow-primary-glow select-none shrink-0">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-success ring-4 ring-card" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground truncate">{name}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-bold">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  {user?.role || 'ORGANIZATION_ADMIN'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-mono font-medium">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email || 'lead.architect@aurora.tech'}</p>
              <p className="text-xs text-subtle font-mono">{title} · {organizationName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/15 border border-destructive/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border overflow-x-auto no-scrollbar pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer',
                  isActive
                    ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-feed/50 rounded-t-xl'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: General Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {saveStatus && (
              <div
                className={cn(
                  'p-4 rounded-xl border text-xs flex items-center gap-2.5',
                  saveStatus.type === 'success'
                    ? 'bg-success/15 border-success/30 text-success'
                    : 'bg-destructive/15 border-destructive/30 text-destructive'
                )}
              >
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{saveStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-card border border-border shadow-card space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Work Email (Verified)
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'lead.architect@aurora.tech'}
                      className="w-full bg-surface-feed/50 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Role / Job Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Principal Architect"
                    className="w-full bg-surface-feed border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Organization / Company
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="w-4 h-4 text-muted-foreground absolute left-3.5" />
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Professional Bio / Mission
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your technical focus and failure intelligence domain..."
                  className="w-full bg-surface-feed border border-border rounded-xl p-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(orgPrimaryBtnClass, 'inline-flex items-center gap-2')}
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Security & Credentials */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {passStatus && (
              <div
                className={cn(
                  'p-4 rounded-xl border text-xs flex items-center gap-2.5',
                  passStatus.type === 'success'
                    ? 'bg-success/15 border-success/30 text-success'
                    : 'bg-destructive/15 border-destructive/30 text-destructive'
                )}
              >
                {passStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{passStatus.message}</span>
              </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-card border border-border shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Change Account Password</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update your password to ensure strong security across your intelligence enclave.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Hide' : 'Show'} passwords</span>
                </button>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Current Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-feed border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-surface-feed border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-surface-feed border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={changingPass}
                  className={cn(orgPrimaryBtnClass, 'inline-flex items-center gap-2')}
                >
                  <Lock className="w-4 h-4" />
                  <span>{changingPass ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>

            {/* Active Sessions */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Active Browser Sessions</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manage connected devices and active authorization tokens.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-feed border border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Current Next.js Client (Active)</span>
                      <span className="px-1.5 py-0.5 rounded bg-success/15 text-success text-[10px] font-mono">
                        This Device
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      IP: 3.110.185.102 · Session Token: `__Host-failureops-session` · Validated
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/15 border border-destructive/30 transition-colors cursor-pointer"
                >
                  Terminate Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Organization & Enclave */}
        {activeTab === 'organization' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OrgMetricCard
                label="Tenant Identifier"
                value={user?.organizationId || 'org_aurora_technologies'}
                hint="Isolated Database Schema"
                valueClassName="text-primary text-base sm:text-lg truncate"
              />
              <OrgMetricCard
                label="Reasoning Enclave"
                value="ONLINE"
                hint="Zero-Knowledge Isolation"
                valueClassName="text-success"
              />
              <OrgMetricCard
                label="Assigned Role"
                value={user?.role || 'ADMIN'}
                hint="Full Enclave Permissions"
                valueClassName="text-accent text-sm sm:text-base"
              />
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-card space-y-4">
              <h3 className="text-sm font-bold text-foreground">Enclave Role Capabilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'Autonomous Agent Orchestration', status: 'ENABLED', desc: 'Execute 7-stage deep failure intelligence reasoning passes.' },
                  { name: 'pgvector High-Dim Search', status: 'ENABLED', desc: 'Direct 2048-dim hybrid semantic retrieval across all project documents.' },
                  { name: 'SMTP Early-Warning Dispatch', status: 'ENABLED', desc: 'Dispatch Sev-1 critical radar alert emails to engineering leads.' },
                  { name: 'Cross-Tenant Learning Contribution', status: 'ENABLED', desc: 'Contribute sanitized failure patterns to global benchmark memory.' },
                ].map((cap, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-surface-feed border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{cap.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-mono font-bold">
                        {cap.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{cap.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Privacy & Notifications */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-card space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground">Notification & Alert Frequencies</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure real-time delivery rules for automated failure warnings.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-surface-feed border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">Sev-1 Critical Failure Alerts</span>
                    <p className="text-[11px] text-muted-foreground">
                      Instantly dispatch email alerts when an active project risk exceeds 80% or reaches critical velocity.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sev1Immediate}
                    onChange={(e) => setSev1Immediate(e.target.checked)}
                    className="size-4 mt-1 accent-primary rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-surface-feed border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">Weekly Executive Failure Radar Digest</span>
                    <p className="text-[11px] text-muted-foreground">
                      Receive a weekly brief summarizing emerging patterns, active experiments, and resolved risk points.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="size-4 mt-1 accent-primary rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-surface-feed border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">Contribute Anonymized Learnings</span>
                    <p className="text-[11px] text-muted-foreground">
                      Allow sanitized causal patterns to help train global failure benchmark archetypes (PII and secrets stripped).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={learningShareApproved}
                    onChange={(e) => setLearningShareApproved(e.target.checked)}
                    className="size-4 mt-1 accent-primary rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={cn(orgPrimaryBtnClass, 'inline-flex items-center gap-2')}
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Audit Activity */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Security & Activity Audit Log</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Immutable timestamped log of authenticated user interactions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshUser}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Log</span>
                </button>
              </div>

              <div className="space-y-3">
                {(user?.recentActivity && user.recentActivity.length > 0
                  ? user.recentActivity
                  : [
                      {
                        id: 'act_demo_1',
                        action: 'Session Authenticated',
                        details: 'User logged into intelligence enclave from secure workspace.',
                        timestamp: new Date().toISOString(),
                      },
                    ]
                ).map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl bg-surface-feed border border-border flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{act.action}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{act.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-subtle shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </OrgShell>
  );
}
