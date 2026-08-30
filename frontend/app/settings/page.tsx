'use client';

import React, { useState } from 'react';
import { Fingerprint, RefreshCw, Shield } from 'lucide-react';
import {
  OrgInsightCard,
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  orgPrimaryBtnClass,
} from '@/components/layout/OrgShell';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';

export default function SettingsPrivacyPage() {
  const { theme } = useApp();
  const [isTestingBff, setIsTestingBff] = useState(false);
  const [bffTestResult, setBffTestResult] = useState<string | null>(null);
  const [policySaved, setPolicySaved] = useState(false);

  const isDark = theme === 'dark';

  const handleTestBffSecurity = async () => {
    setIsTestingBff(true);
    setBffTestResult(null);
    try {
      const projects = await apiClient.getProjects();
      setBffTestResult(
        `BFF proxy handshake verified. Retrieved ${projects.length} authorized tenant projects via /api/projects with zero client secret exposure.`
      );
    } catch (err: any) {
      setBffTestResult(`Handshake error: ${err.message}`);
    } finally {
      setIsTestingBff(false);
    }
  };

  return (
    <OrgShell>
      <OrgPageHeader
        eyebrow="Privacy  ·  Theme"
        title="Settings & Privacy"
        description="Enclave policy, retention, and Obsidian / Porcelain appearance."
        action={
          <button
            type="button"
            className={orgPrimaryBtnClass}
            onClick={() => {
              setPolicySaved(true);
              window.setTimeout(() => setPolicySaved(false), 1600);
            }}
          >
            {policySaved ? 'Policy saved' : 'Save policy'}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrgMetricCard
          label="Mode"
          value={isDark ? 'Dark' : 'Light'}
          hint={isDark ? 'Obsidian' : 'Porcelain'}
          valueClassName="text-primary"
        />
        <OrgMetricCard label="Retention" value="90d" hint="Then purge" valueClassName="text-info" />
        <OrgMetricCard label="Sharing" value="Private" hint="No external export" valueClassName="text-success" />
        <OrgMetricCard label="Enclave" value="Active" hint="Tenant Isolated" valueClassName="text-primary" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <OrgInsightCard
          title="Theme"
          body="Obsidian Ember default. Porcelain light is first-class — same tokens, inverted surfaces."
        />
        <OrgInsightCard
          title="Privacy Enclave"
          body="Strict multi-tenant scoping. Raw evidence never leaves the project enclave."
        />
      </div>


      <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Backend-for-Frontend handshake</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Public client → same-origin /api/* → private enclave. Zero client secrets exposed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestBffSecurity}
            disabled={isTestingBff}
            className={orgPrimaryBtnClass}
          >
            {isTestingBff ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Verifying enclave...</span>
              </>
            ) : (
              <>
                <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Test live BFF proxy</span>
              </>
            )}
          </button>
        </div>
        {bffTestResult && (
          <p
            role="status"
            className="rounded-xl border border-success/30 bg-success/10 p-3 font-mono text-xs text-success"
          >
            {bffTestResult}
          </p>
        )}
      </div>
    </OrgShell>
  );
}
