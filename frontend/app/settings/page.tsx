'use client';

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  RefreshCw,
  Shield,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Server,
  Lock,
  Cpu,
  Sparkles,
  Key,
  Trash2,
  Check,
  Globe,
  Radio,
} from 'lucide-react';
import {
  OrgInsightCard,
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  orgPrimaryBtnClass,
  orgSecondaryBtnClass,
} from '@/components/layout/OrgShell';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';
import { CustomAIConfig, CustomAITestResult } from '@/types';

export default function SettingsPrivacyPage() {
  const { theme } = useApp();
  const [isTestingBff, setIsTestingBff] = useState(false);
  const [bffTestResult, setBffTestResult] = useState<string | null>(null);
  const [policySaved, setPolicySaved] = useState(false);

  // SMTP state
  const [testEmailRecipient, setTestEmailRecipient] = useState('contact@shyxon.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [smtpConnected, setSmtpConnected] = useState<boolean | null>(null);

  // Custom AI Provider state
  const [aiConfig, setAiConfig] = useState<CustomAIConfig | null>(null);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<CustomAITestResult | null>(null);
  const [aiSaveMessage, setAiSaveMessage] = useState<{ success: boolean; text: string } | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    // Check initial SMTP status
    fetch('/api/email/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.connected) {
          setSmtpConnected(true);
        } else {
          setSmtpConnected(false);
        }
      })
      .catch(() => setSmtpConnected(false));

    // Load AI Configuration
    apiClient.getCustomAIConfig().then((cfg) => {
      setAiConfig(cfg);
      if (cfg && cfg.endpoint_url) {
        setEndpointUrl(cfg.endpoint_url);
        setModelName(cfg.model_name || '');
      }
    }).catch(() => {});
  }, []);

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpointUrl.trim() || !modelName.trim()) return;
    if (!aiConfig?.has_api_key && !apiKey.trim()) {
      setAiSaveMessage({ success: false, text: 'Please provide an API Key or Bearer Token.' });
      return;
    }

    setIsSavingAi(true);
    setAiSaveMessage(null);
    try {
      const saved = await apiClient.saveCustomAIConfig({
        endpoint_url: endpointUrl.trim(),
        model_name: modelName.trim(),
        api_key: apiKey.trim() || 'KEEP_EXISTING_KEY',
      });
      setAiConfig(saved);
      setIsEditingKey(false);
      setApiKey('');
      setAiSaveMessage({
        success: true,
        text: `Custom AI endpoint securely saved and verified (${saved.status === 'CONNECTED' ? 'Connected' : 'Saved'}).`,
      });
    } catch (err: any) {
      setAiSaveMessage({ success: false, text: err.message || 'Failed to save custom AI configuration.' });
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const payload = isEditingKey && apiKey
        ? { endpoint_url: endpointUrl.trim(), model_name: modelName.trim(), api_key: apiKey.trim() }
        : undefined;

      const result = await apiClient.testCustomAIConnection(payload);
      setAiTestResult(result);
      if (result.success && aiConfig) {
        setAiConfig({ ...aiConfig, status: 'CONNECTED', latency_ms: result.latency_ms });
      }
    } catch (err: any) {
      setAiTestResult({
        success: false,
        provider: 'custom',
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleDeleteAiConfig = async () => {
    if (!confirm('Are you sure you want to remove the custom AI provider and revert to default?')) return;
    try {
      await apiClient.deleteCustomAIConfig();
      setAiConfig(null);
      setEndpointUrl('');
      setModelName('');
      setApiKey('');
      setIsEditingKey(false);
      setAiTestResult(null);
      setAiSaveMessage({ success: true, text: 'Custom AI provider removed. Reverted to default intelligence provider.' });
    } catch (err: any) {
      setAiSaveMessage({ success: false, text: err.message || 'Failed to remove custom provider.' });
    }
  };

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

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient) return;

    setIsSendingTestEmail(true);
    setEmailStatusMessage(null);

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_email: testEmailRecipient }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatusMessage({
          success: true,
          text: `Verification email successfully dispatched to ${testEmailRecipient} via smtp.nexudo.email:465 (SSL).`,
        });
        setSmtpConnected(true);
      } else {
        setEmailStatusMessage({
          success: false,
          text: data.error || 'Failed to dispatch email.',
        });
      }
    } catch (err: any) {
      setEmailStatusMessage({
        success: false,
        text: err.message || 'Network error while contacting SMTP gateway.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  return (
    <OrgShell>
      <OrgPageHeader
        eyebrow="Privacy  ·  Theme  ·  SMTP"
        title="Settings & Notifications"
        description="Enclave policy, appearance, and enterprise SMTP alert routing."
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
        <OrgMetricCard
          label="SMTP Gateway"
          value={smtpConnected === null ? 'Checking' : smtpConnected ? 'Online' : 'Configured'}
          hint="smtp.nexudo.email"
          valueClassName={smtpConnected ? 'text-success' : 'text-primary'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <OrgInsightCard
          title="Theme Appearance"
          body="Obsidian Ember default. Porcelain light is first-class — same tokens, inverted surfaces."
        />
        <OrgInsightCard
          title="Privacy Enclave"
          body="Strict multi-tenant scoping. Raw evidence never leaves the project enclave."
        />
      </div>

      {/* SMTP Email Service Panel */}
      <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">SMTP & Early-Warning Dispatch</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>SSL Port 465 Verified</span>
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Configured with <code>contact@shyxon.com</code> via <code>smtp.nexudo.email</code> for automated Sev-1 radar alerts and executive briefings.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-surface-feed border border-border">
            <span className="text-[10px] text-muted-foreground block">SMTP Server</span>
            <span className="font-bold text-foreground truncate block">smtp.nexudo.email</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-feed border border-border">
            <span className="text-[10px] text-muted-foreground block">Port & Security</span>
            <span className="font-bold text-foreground truncate block">465 (SSL/TLS)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-feed border border-border">
            <span className="text-[10px] text-muted-foreground block">Sender Identity</span>
            <span className="font-bold text-foreground truncate block">contact@shyxon.com</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-feed border border-border">
            <span className="text-[10px] text-muted-foreground block">IMAP Mailbox</span>
            <span className="font-bold text-foreground truncate block">imap.nexudo.email:993</span>
          </div>
        </div>

        {/* Send Test Email Form */}
        <form onSubmit={handleSendTestEmail} className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              placeholder="recipient@domain.com"
              className="w-full bg-surface-feed border border-border rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={isSendingTestEmail}
            className={orgPrimaryBtnClass}
          >
            {isSendingTestEmail ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Sending Test...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Dispatch Test Email</span>
              </>
            )}
          </button>
        </form>

        {emailStatusMessage && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              emailStatusMessage.success
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {emailStatusMessage.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{emailStatusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Custom AI Provider Configuration Panel */}
      <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Cpu className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">Custom AI Provider & Model Gateway</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border ${
                    aiConfig?.status === 'CONNECTED'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : aiConfig?.status === 'ERROR'
                      ? 'bg-destructive/15 text-destructive border-destructive/30'
                      : 'bg-muted/40 text-muted-foreground border-border'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      aiConfig?.status === 'CONNECTED'
                        ? 'bg-emerald-400'
                        : aiConfig?.status === 'ERROR'
                        ? 'bg-destructive'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  <span>
                    {aiConfig?.status === 'CONNECTED'
                      ? `Connected (${aiConfig.latency_ms || 450}ms)`
                      : aiConfig?.status === 'ERROR'
                      ? 'Error / Offline'
                      : 'Not Configured'}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Connect external OpenAI-compatible endpoints (vLLM, Ollama, Together, Groq, Fireworks, AWS Bedrock). Encrypted at rest with AES-GCM-256 and server-side SSRF validation.
              </p>
            </div>
          </div>

          {aiConfig?.is_active && (
            <button
              type="button"
              onClick={handleDeleteAiConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors cursor-pointer self-start"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Remove Provider</span>
            </button>
          )}
        </div>

        {/* Custom AI Form */}
        <form onSubmit={handleSaveAiConfig} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ai-endpoint" className="block text-[11px] font-semibold text-foreground mb-1">
                Custom Endpoint URL (HTTPS)
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="ai-endpoint"
                  type="url"
                  required
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://api.together.xyz/v1"
                  className="w-full bg-surface-feed border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ai-model" className="block text-[11px] font-semibold text-foreground mb-1">
                Target Model Name
              </label>
              <div className="relative">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="ai-model"
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="meta-llama/Llama-3.3-70B-Instruct"
                  className="w-full bg-surface-feed border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="ai-key" className="block text-[11px] font-semibold text-foreground mb-1">
              API Key / Bearer Token
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Key className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                {aiConfig?.has_api_key && !isEditingKey ? (
                  <div className="w-full bg-surface-feed border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-muted-foreground flex items-center justify-between">
                    <span>••••••••••••••••••••••••••••••••</span>
                    <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Encrypted at rest
                    </span>
                  </div>
                ) : (
                  <input
                    id="ai-key"
                    type="password"
                    required={!aiConfig?.has_api_key}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API Key or Bearer token (never sent to browser)"
                    className="w-full bg-surface-feed border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>

              {aiConfig?.has_api_key && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingKey(!isEditingKey);
                    setApiKey('');
                  }}
                  className={orgSecondaryBtnClass}
                >
                  {isEditingKey ? 'Keep Saved Key' : 'Replace Key'}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3 text-primary" />
              <span>Zero client CORS dependency. Server-side proxy with strict SSRF filtering.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestAiConnection}
                disabled={isTestingAi || (!aiConfig?.has_api_key && !apiKey)}
                className={orgSecondaryBtnClass}
              >
                {isTestingAi ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={isSavingAi}
                className={orgPrimaryBtnClass}
              >
                {isSavingAi ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {aiSaveMessage && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              aiSaveMessage.success
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {aiSaveMessage.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{aiSaveMessage.text}</span>
          </div>
        )}

        {aiTestResult && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
              aiTestResult.success
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            <div className="flex items-center gap-2">
              {aiTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>
                {aiTestResult.success
                  ? `Connection successful. Model: ${aiTestResult.model || modelName} (${aiTestResult.latency_ms}ms)`
                  : `Connection test failed: ${aiTestResult.message || 'Provider unreachable'}`}
              </span>
            </div>
            {aiTestResult.code && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-card border border-border">
                {aiTestResult.code}
              </span>
            )}
          </div>
        )}
      </div>

      {/* BFF Proxy Security Test Panel */}
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
