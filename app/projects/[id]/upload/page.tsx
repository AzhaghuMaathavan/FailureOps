'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  Users,
  ShieldAlert,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { EvidenceSourceType, UploadProgress } from '@/types';
import { useApp } from '@/context/AppContext';
import { ProcessingTimeline } from '@/components/evidence/ProcessingTimeline';
import { simulateFileUpload } from '@/services/evidenceService';

export default function EvidenceUploadPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project, uploadedFiles, addUploadedFile } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressList, setProgressList] = useState<UploadProgress[]>([]);
  const [activeFileCategory, setActiveFileCategory] = useState<EvidenceSourceType | null>(null);

  const categories = [
    {
      type: 'PRODUCT_PLAN' as EvidenceSourceType,
      title: 'PRODUCT PLAN',
      description: 'Roadmaps, PRDs, project plans, feature specs, and hard release milestones.',
      formats: 'PDF, DOCX, MD',
      icon: FileText,
      defaultFile: 'product_plan.pdf',
    },
    {
      type: 'CUSTOMER_FEEDBACK' as EvidenceSourceType,
      title: 'CUSTOMER FEEDBACK',
      description: 'Surveys, qualitative interviews, onboarding drop-off tickets, and NPS reviews.',
      formats: 'CSV, JSON, TXT',
      icon: Users,
      defaultFile: 'customer_feedback.csv',
    },
    {
      type: 'PRODUCT_METRICS' as EvidenceSourceType,
      title: 'PRODUCT METRICS',
      description: 'User activation, retention curves, trial conversion, and churn telemetry.',
      formats: 'CSV, XLSX',
      icon: FileSpreadsheet,
      defaultFile: 'product_metrics.csv',
    },
    {
      type: 'ENGINEERING_METRICS' as EvidenceSourceType,
      title: 'ENGINEERING METRICS',
      description: 'CI/CD deployment breakages, P1 bug backlog, MTTR, and build pipeline logs.',
      formats: 'CSV, JSON',
      icon: FileCode,
      defaultFile: 'engineering_metrics.csv',
    },
    {
      type: 'TEAM_OPERATIONS' as EvidenceSourceType,
      title: 'TEAM OPERATIONS',
      description: 'PR review latencies, sprint workload, engineer overtime, and context switching.',
      formats: 'CSV, JSON',
      icon: Cpu,
      defaultFile: 'team_operations.csv',
    },
    {
      type: 'INCIDENT_REPORTS' as EvidenceSourceType,
      title: 'INCIDENT REPORTS',
      description: 'Production postmortems, staging deadlocks, migration rollbacks, and retros.',
      formats: 'PDF, MD, TXT',
      icon: ShieldAlert,
      defaultFile: 'incidents_postmortems.pdf',
    },
  ];

  const handleSimulateUpload = async (cat: EvidenceSourceType, filename: string) => {
    setActiveFileCategory(cat);
    setIsProcessing(true);

    await simulateFileUpload(filename, cat, progress => {
      setProgressList(prev => [
        ...prev.filter(p => p.file !== filename),
        progress,
      ]);
    });

    addUploadedFile(cat, filename);
    setIsProcessing(false);
  };

  const handleLoadAuroraDefaults = async () => {
    setIsProcessing(true);
    for (const cat of categories) {
      addUploadedFile(cat.type, cat.defaultFile);
    }
    // Mock fast batch indexing
    setProgressList(
      categories.map(c => ({
        file: c.defaultFile,
        category: c.type,
        stage: 'COMPLETED',
        progress: 100,
      }))
    );
    setIsProcessing(false);
  };

  const totalFiles = Object.values(uploadedFiles).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Step 2 of Intelligence Setup
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-feed border border-border text-muted-foreground">
              {project.company} / {project.name}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Build the Evidence Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload the fragmented project evidence FailureOps will continuously reason over to discover weak failure seeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLoadAuroraDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-feed hover:bg-card border border-border text-xs font-mono font-bold text-foreground transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Load 5 Core Mock Files</span>
          </button>

          <button
            onClick={() => router.push(`/projects/${projectId}/analysis`)}
            disabled={totalFiles < 2 || isProcessing}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
              totalFiles >= 2 && !isProcessing
                ? 'bg-primary hover:bg-primary-hover text-white shadow-[0_0_20px_-3px_rgba(255,122,0,0.5)]'
                : 'bg-surface-feed text-muted-foreground/50 border border-border cursor-not-allowed'
            }`}
          >
            <span>ANALYZE PROJECT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map(cat => {
          const files = uploadedFiles[cat.type] || [];
          const Icon = cat.icon;
          const isCurrentActive = activeFileCategory === cat.type && isProcessing;

          return (
            <div
              key={cat.type}
              className={`p-6 rounded-2xl bg-card border transition-all duration-200 flex flex-col justify-between ${
                files.length > 0
                  ? 'border-border/90 shadow-sm'
                  : 'border-dashed border-border/80 hover:border-primary/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-feed border border-border flex items-center justify-center text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold font-mono tracking-wider text-foreground">
                      {cat.title}
                    </h3>
                  </div>

                  <span className="text-[10px] font-mono text-muted-foreground">
                    {cat.formats}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>

                {/* Uploaded File Pill */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {files.map(f => (
                      <div
                        key={f}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-feed border border-border/70 text-xs font-mono"
                      >
                        <span className="text-foreground flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {f}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                          Indexed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Action Button */}
              <div className="mt-5 pt-3 border-t border-border/50">
                <button
                  onClick={() => handleSimulateUpload(cat.type, cat.defaultFile)}
                  disabled={isProcessing}
                  className="w-full py-2 px-3 rounded-xl bg-surface-feed hover:bg-card border border-border hover:border-primary/50 text-xs font-semibold text-foreground transition-all flex items-center justify-center gap-2"
                >
                  {isCurrentActive ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                      <span>Parsing & Indexing...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-primary" />
                      <span>{files.length > 0 ? 'Replace / Add File' : 'Upload Evidence File'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Processing Visualization Component */}
      <ProcessingTimeline
        progressList={progressList}
        isComplete={totalFiles >= 5}
      />

      {/* Next Step Guidance */}
      <div className="p-4 rounded-xl bg-surface-feed border border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="text-primary font-bold">{totalFiles} Evidence Sources Loaded:</span>
          <span>Sufficient for cross-source signal reconciliation & Failure DNA synthesis.</span>
        </div>

        <button
          onClick={() => router.push(`/projects/${projectId}/analysis`)}
          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline font-mono"
        >
          <span>Run 10-Stage Reasoning Pipeline →</span>
        </button>
      </div>
    </div>
  );
}
