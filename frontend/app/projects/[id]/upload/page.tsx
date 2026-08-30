'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  Users,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Trash2,
  FileCheck,
  FolderOpen,
  X,
  AlertCircle,
  RotateCw,
  Plus
} from 'lucide-react';
import { EvidenceSourceType } from '@/types';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';
import { KpiStat } from '@/components/evidence/KpiStat';
import { LangGraphRunView } from '@/components/pipeline/LangGraphRunPanel';
import { PipelineStatusPanel } from '@/components/pipeline/PipelineStatusPanel';

interface PendingFileItem {
  id: string;
  file: File;
  category: EvidenceSourceType;
  title: string;
  description: string;
  visibility: 'PRIVATE' | 'ORGANIZATION';
  department: string;
}

interface CategoryUploadStatus {
  status: 'IDLE' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  fileName?: string;
  error?: string | null;
  filesCount?: number;
}

export default function EvidenceUploadPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project } = useApp();

  const [backendDocs, setBackendDocs] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [ragUnavailable, setRagUnavailable] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [replacingPendingId, setReplacingPendingId] = useState<string | null>(null);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [langGraphRun, setLangGraphRun] = useState<LangGraphRunView | null>(null);

  // Per-category upload progress tracking
  const [categoryStatus, setCategoryStatus] = useState<Record<string, CategoryUploadStatus>>({});

  const globalFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  // Category specific file input refs for direct activation
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const categories: { type: EvidenceSourceType; title: string; description: string; formats: string; accept: string; icon: any }[] = [
    {
      type: 'PRODUCT_PLAN',
      title: 'PRODUCT PLAN',
      description: 'Roadmaps, PRDs, project plans, feature specs, and hard release milestones.',
      formats: 'PDF, DOCX, MD, TXT',
      accept: '.pdf,.docx,.md,.txt',
      icon: FileText,
    },
    {
      type: 'CUSTOMER_FEEDBACK',
      title: 'CUSTOMER FEEDBACK',
      description: 'Surveys, qualitative interviews, onboarding drop-off tickets, and NPS reviews.',
      formats: 'CSV, JSON, TXT',
      accept: '.csv,.json,.txt',
      icon: Users,
    },
    {
      type: 'PRODUCT_METRICS',
      title: 'PRODUCT METRICS',
      description: 'User activation, retention curves, trial conversion, and churn telemetry.',
      formats: 'CSV, XLSX, JSON',
      accept: '.csv,.xlsx,.json',
      icon: FileSpreadsheet,
    },
    {
      type: 'ENGINEERING_METRICS',
      title: 'ENGINEERING METRICS',
      description: 'CI/CD deployment breakages, P1 bug backlog, MTTR, and build pipeline logs.',
      formats: 'CSV, JSON, TXT',
      accept: '.csv,.json,.txt',
      icon: FileCode,
    },
    {
      type: 'TEAM_OPERATIONS',
      title: 'TEAM OPERATIONS',
      description: 'PR review latencies, sprint workload, engineer overtime, and context switching.',
      formats: 'CSV, JSON, TXT',
      accept: '.csv,.json,.txt',
      icon: Cpu,
    },
    {
      type: 'INCIDENT_REPORTS',
      title: 'INCIDENT REPORTS',
      description: 'Production postmortems, staging deadlocks, migration rollbacks, and retros.',
      formats: 'PDF, MD, TXT, DOCX',
      accept: '.pdf,.md,.txt,.docx',
      icon: ShieldAlert,
    },
  ];

  const fetchBackendDocuments = async (silent = false) => {
    try {
      if (!silent) setIsLoadingDocs(true);
      const [data, latestRun] = await Promise.all([
        apiClient.getRagPipeline(projectId),
        apiClient.getLatestLangGraphRun(projectId).catch(() => null),
      ]);
      setPipeline(data);
      setBackendDocs(data.documents || []);
      if (latestRun) setLangGraphRun(latestRun);
      setRagUnavailable(false);
    } catch (err: unknown) {
      console.error('Failed to load project documents:', err);
      if (isRagUnavailable(err)) {
        setRagUnavailable(true);
        setBackendDocs([]);
        setPipeline(null);
      } else if (!silent) {
        setUploadError(err instanceof Error ? err.message : 'Failed to load project documents.');
        setBackendDocs([]);
      }
    } finally {
      if (!silent) setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchBackendDocuments();
  }, [projectId]);

  useEffect(() => {
    const indexing = backendDocs.some(
      (d) => d.status === 'PENDING' || d.status === 'PROCESSING' || (d.chunk_count > 0 && d.embedded_count < d.chunk_count)
    );
    if (!indexing && !ragUnavailable) return;
    const id = setInterval(() => fetchBackendDocuments(true), 2500);
    return () => clearInterval(id);
  }, [projectId, ragUnavailable, backendDocs.map((d) => `${d.id}:${d.status}:${d.chunk_count}:${d.embedded_count}`).join('|')]);

  useEffect(() => {
    if (!langGraphRun?.runId) return;
    if (langGraphRun.status !== 'QUEUED' && langGraphRun.status !== 'RUNNING') return;
    const id = setInterval(async () => {
      try {
        const next = await apiClient.getLangGraphRun(langGraphRun.runId);
        if (next) setLangGraphRun(next);
        if (next?.status === 'RUNNING' || next?.status === 'COMPLETED') {
          fetchBackendDocuments(true);
        }
      } catch {
        /* keep last snapshot */
      }
    }, 1500);
    return () => clearInterval(id);
  }, [langGraphRun?.runId, langGraphRun?.status, projectId]);

  // Direct category upload execution
  const uploadFilesForCategory = async (catType: EvidenceSourceType, files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setCategoryStatus((prev) => ({
      ...prev,
      [catType]: {
        status: 'UPLOADING',
        fileName: list.length === 1 ? list[0].name : `${list.length} files`,
        filesCount: list.length,
        error: null,
      },
    }));
    setUploadError(null);

    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setCategoryStatus((prev) => ({
          ...prev,
          [catType]: {
            status: 'UPLOADING',
            fileName: file.name,
            filesCount: list.length,
            error: null,
          },
        }));

        await apiClient.uploadProjectFile(
          projectId,
          file,
          file.name.replace(/\.[^.]+$/, ''),
          catType,
          '',
          { sync: 'false' }
        );
      }

      setCategoryStatus((prev) => ({
        ...prev,
        [catType]: {
          status: 'COMPLETED',
          fileName: list.length === 1 ? list[0].name : `${list.length} files uploaded`,
          filesCount: list.length,
          error: null,
        },
      }));

      await fetchBackendDocuments(true);

      setTimeout(() => {
        setCategoryStatus((prev) => ({
          ...prev,
          [catType]: { status: 'IDLE' },
        }));
      }, 4000);
    } catch (err: any) {
      setCategoryStatus((prev) => ({
        ...prev,
        [catType]: {
          status: 'FAILED',
          fileName: list[0].name,
          error: err?.message || 'Upload failed. Please check format and retry.',
        },
      }));
    }
  };

  const triggerCategoryUpload = (catType: EvidenceSourceType) => {
    const input = categoryInputRefs.current[catType];
    if (input) {
      input.value = '';
      input.click();
    }
  };

  const handleCategoryFileChange = (catType: EvidenceSourceType, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFilesForCategory(catType, files);
  };

  const inferCategoryFromFilename = (filename: string): EvidenceSourceType => {
    const fn = filename.toLowerCase();
    const ext = fn.split('.').pop() || '';
    if (ext === 'xlsx') return 'PRODUCT_METRICS';
    if ((ext === 'pdf' || ext === 'docx') && (fn.includes('incident') || fn.includes('postmortem') || fn.includes('rca') || fn.includes('outage') || fn.includes('deadlock'))) {
      return 'INCIDENT_REPORTS';
    }
    if ((ext === 'pdf' || ext === 'docx' || ext === 'md' || ext === 'txt') && (fn.includes('plan') || fn.includes('prd') || fn.includes('roadmap') || fn.includes('spec') || fn.includes('fintech') || fn.includes('design') || fn.includes('doc'))) {
      return 'PRODUCT_PLAN';
    }
    if (fn.includes('feedback') || fn.includes('survey') || fn.includes('nps') || fn.includes('interview') || fn.includes('ticket') || fn.includes('review') || fn.includes('customer')) {
      return 'CUSTOMER_FEEDBACK';
    }
    if (fn.includes('ci') || fn.includes('build') || fn.includes('deploy') || fn.includes('pipeline') || fn.includes('latency') || fn.includes('eng')) {
      return 'ENGINEERING_METRICS';
    }
    if (fn.includes('ops') || fn.includes('sprint') || fn.includes('team') || fn.includes('workload') || fn.includes('overtime') || fn.includes('turnaround')) {
      return 'TEAM_OPERATIONS';
    }
    if (fn.includes('metric') || fn.includes('telemetry') || fn.includes('activation') || fn.includes('retention') || fn.includes('churn') || fn.includes('conversion') || fn.includes('kpi')) {
      return 'PRODUCT_METRICS';
    }
    if (ext === 'csv' || ext === 'json') return 'CUSTOMER_FEEDBACK';
    return 'PRODUCT_PLAN';
  };

  // Global staging area handlers
  const stageSelectedFiles = (files: FileList | File[], defaultCat?: EvidenceSourceType) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const newItems: PendingFileItem[] = list.map((file) => ({
      id: `pending_${Math.random().toString(36).substring(2, 9)}`,
      file,
      category: defaultCat || inferCategoryFromFilename(file.name),
      title: file.name.replace(/\.[^.]+$/, ''),
      description: '',
      visibility: 'PRIVATE',
      department: '',
    }));
    setPendingFiles((prev) => [...prev, ...newItems]);
    setUploadError(null);
  };

  const handleSelectFilesGlobal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    stageSelectedFiles(selected);
    if (globalFileInputRef.current) globalFileInputRef.current.value = '';
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !replacingPendingId) return;

    setPendingFiles((prev) =>
      prev.map((item) =>
        item.id === replacingPendingId
          ? { ...item, file: selected }
          : item
      )
    );
    setReplacingPendingId(null);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const triggerReplacePending = (id: string) => {
    setReplacingPendingId(id);
    if (replaceInputRef.current) replaceInputRef.current.click();
  };

  const handleUploadAllPending = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const started = await apiClient.startLangGraphRun(
        projectId,
        pendingFiles.map((item) => item.file),
        pendingFiles.map((item) => ({
          title: item.title || item.file.name,
          documentType: item.category,
          description: item.description,
          visibility: item.visibility,
          department: item.department,
        }))
      );
      setLangGraphRun(started);
      setPendingFiles([]);
      await fetchBackendDocuments(true);
    } catch (err: any) {
      setUploadError(err.message || 'LangGraph upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryReasoning = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);
      await apiClient.startAnalysis(projectId, 'DEEP');
      await fetchBackendDocuments(true);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to retry reasoning analysis.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBackendDoc = async (docId?: string) => {
    if (!docId || docId === 'undefined') {
      console.warn('[handleDeleteBackendDoc] Ignored deletion of empty docId');
      return;
    }
    try {
      setDeletingDocId(docId);
      await apiClient.deleteDocument(projectId, docId);
      await fetchBackendDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to delete document from database.');
    } finally {
      setDeletingDocId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalUploaded = backendDocs.length;
  const queuedCount =
    pendingFiles.length +
    backendDocs.filter((d) => d.status === 'PENDING' || d.status === 'PROCESSING').length;
  const readyCount = backendDocs.filter(
    (d) => d.status === 'COMPLETED' && Number(d.chunk_count || 0) > 0
  ).length;
  const rejectedCount = backendDocs.filter((d) => d.status === 'FAILED').length;
  const quotaBytes = backendDocs.reduce((sum, d) => sum + Number(d.file_size ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Hidden global input */}
      <input
        type="file"
        ref={globalFileInputRef}
        onChange={handleSelectFilesGlobal}
        className="hidden"
        multiple
        accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.md,.json"
      />
      {/* Hidden replace input */}
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceFile}
        className="hidden"
        accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.md,.json"
      />

      {/* Hidden dedicated inputs for each category */}
      {categories.map((cat) => (
        <input
          key={cat.type}
          type="file"
          ref={(el) => {
            categoryInputRefs.current[cat.type] = el;
          }}
          onChange={(e) => handleCategoryFileChange(cat.type, e)}
          className="hidden"
          multiple
          accept={cat.accept}
        />
      ))}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            EVIDENCE INTAKE & NORMALIZATION
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[28px]">
            Build Your Project Intelligence
          </h1>
          <p className="max-w-xl text-[13px] text-muted-foreground">
            Drop PRDs, telemetry CSVs, feedback, and postmortems into your isolated enclave. Ingestion parses, chunks, and embeds documents automatically.
          </p>

          <p className="font-mono text-[10px] text-muted-foreground">
            {project.company || 'Enterprise'} / {project.name || projectId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => globalFileInputRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
            <span>Select files</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/analysis`)}
            disabled={totalUploaded < 1 || isUploading}
            className={`inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              totalUploaded >= 1 && !isUploading
                ? 'cursor-pointer bg-primary text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] hover:bg-primary-hover'
                : 'cursor-not-allowed border border-border bg-surface-feed text-muted-foreground/50 opacity-50'
            }`}
          >
            <span>Run Analysis</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {ragUnavailable && (
        <div
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive"
        >
          RAG unavailable. Document indexing, chunk counts, and embeddings cannot be loaded until the RAG backend is reachable.
        </div>
      )}

      {uploadError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive"
        >
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            aria-label="Dismiss upload error"
            className="cursor-pointer rounded p-1 text-destructive hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Global Dropzone */}
      <button
        type="button"
        onClick={() => globalFileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingGlobal(true);
        }}
        onDragLeave={() => setIsDraggingGlobal(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingGlobal(false);
          if (e.dataTransfer.files?.length) stageSelectedFiles(e.dataTransfer.files);
        }}
        className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-solid py-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isDraggingGlobal ? 'border-primary bg-primary/10' : 'border-primary/50 bg-surface-feed hover:border-primary'
        }`}
      >
        <UploadCloud className="h-8 w-8 text-primary" />
        <p className="text-base font-semibold text-foreground">Drop files or paste a workspace export</p>
        <p className="text-xs text-muted-foreground">PDF, CSV, JSON, XLSX, DOCX, MD  ·  Encrypted at rest</p>
      </button>

      {/* Metrics Counter */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat label="Queued" value={queuedCount} hint="Scanning" valueClassName="text-info" />
        <KpiStat label="Ready" value={readyCount} hint="Cited" valueClassName="text-success" />
        <KpiStat label="Rejected" value={rejectedCount} hint="Policy" valueClassName="text-muted-foreground" />
        <KpiStat label="Quota" value={formatFileSize(quotaBytes)} hint="Enclave" valueClassName="text-primary" />
      </div>

      {/* Staging Area for multi-file configuration */}
      {pendingFiles.length > 0 && (
        <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-bold text-foreground">
                Selected Evidence Staging ({pendingFiles.length} pending file{pendingFiles.length === 1 ? '' : 's'})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleUploadAllPending}
              disabled={isUploading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-primary px-4 py-2 font-mono text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  <span>Uploading to RAG Engine...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Upload through LangGraph</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {pendingFiles.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-xl border border-border bg-card p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <span className="block truncate font-bold text-foreground">{item.file.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatFileSize(item.file.size)} • Type: {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerReplacePending(item.id)}
                      disabled={isUploading}
                      className="cursor-pointer rounded-lg border border-border bg-surface-feed px-2.5 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => removePendingFile(item.id)}
                      disabled={isUploading}
                      className="cursor-pointer rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-mono text-[11px] text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">Category</span>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        setPendingFiles((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, category: e.target.value as EvidenceSourceType } : row))
                        )
                      }
                      className="w-full cursor-pointer rounded-lg border border-border bg-surface-feed px-2.5 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {categories.map((c) => (
                        <option key={c.type} value={c.type}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">Title</span>
                    <input
                      value={item.title}
                      onChange={(e) =>
                        setPendingFiles((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, title: e.target.value } : row))
                        )
                      }
                      className="w-full cursor-text rounded-lg border border-border bg-surface-feed px-2.5 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified LangGraph Pipeline Status Panel — Single Panel replacing dual duplicate panels */}
      {(langGraphRun || (pipeline && !ragUnavailable)) && (
        <PipelineStatusPanel
          projectId={projectId}
          run={langGraphRun}
          pipeline={pipeline}
          reachable={!ragUnavailable}
          database={pipeline?.health?.database}
          rustfsReachable={pipeline?.health?.rustfsReachable}
          rustfsProvider={pipeline?.health?.rustfsProvider}
          onRetry={handleRetryReasoning}
          onCheckStatus={() => fetchBackendDocuments(true)}
          isChecking={isLoadingDocs}
        />
      )}

      {/* Persisted Evidence Documents List */}
      {backendDocs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
              Persisted Evidence Documents ({backendDocs.length})
            </h3>
            <button
              type="button"
              onClick={() => fetchBackendDocuments()}
              className="flex cursor-pointer items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDocs ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
              <span>Sync</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {backendDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between gap-3 rounded-[10px] border border-border bg-card px-3.5 py-3 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-feed text-primary">
                    <FileCheck className="h-4 w-4 text-success" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 truncate">
                    <h4 className="truncate text-[13px] font-semibold text-foreground">{doc.filename}</h4>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      Category: <span className="font-semibold text-primary">{doc.document_type?.replace(/_/g, ' ') || 'PROJECT_DOC'}</span>
                      {' '}• Size: <span className="font-bold text-foreground">{Number(doc.file_size ?? 0)} B</span>
                      {' '}• Pages: <span className="font-bold text-foreground">{Number(doc.page_count ?? 0)}</span>
                      {' '}• Chunks: <span className="font-bold text-foreground">{Number(doc.chunk_count ?? 0)}</span>
                      {' '}• Embedded: <span className="font-bold text-foreground">{Number(doc.embedded_count ?? 0)}</span>
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold ${
                        doc.status === 'FAILED'
                          ? 'border-destructive/30 bg-surface-feed text-destructive'
                          : doc.status === 'PENDING' || doc.status === 'PROCESSING'
                            ? 'border-warning/30 bg-surface-feed text-warning'
                            : doc.status === 'COMPLETED' && Number(doc.chunk_count || 0) === 0
                              ? 'border-warning/30 bg-surface-feed text-warning'
                              : 'border-success/30 bg-surface-feed text-success'
                      }`}
                    >
                      {doc.status || 'UNKNOWN'}
                    </span>
                    {doc.error_message && (
                      <p role="alert" className="mt-1 font-mono text-[10px] text-destructive">
                        {doc.error_message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteBackendDoc(doc.id || doc.document_id || doc.documentId)}
                  disabled={deletingDocId === (doc.id || doc.document_id || doc.documentId)}
                  className="shrink-0 cursor-pointer rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  title="Delete document and remove associated chunks"
                  aria-label={`Delete ${doc.filename}`}
                >
                  {deletingDocId === (doc.id || doc.document_id || doc.documentId) ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Six Evidence Category Cards with Active Direct Upload Buttons */}
      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Evidence Categories & File Classification
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const categoryDocs = backendDocs.filter((d) => d.document_type === cat.type);
            const statusInfo = categoryStatus[cat.type];
            const isUploadingThisCat = statusInfo?.status === 'UPLOADING';
            const isCompletedThisCat = statusInfo?.status === 'COMPLETED';
            const isFailedThisCat = statusInfo?.status === 'FAILED';
            const isDraggingThis = draggingCategory === cat.type;

            return (
              <div
                key={cat.type}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingCategory(cat.type);
                }}
                onDragLeave={() => setDraggingCategory(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingCategory(null);
                  if (e.dataTransfer.files?.length) {
                    uploadFilesForCategory(cat.type, e.dataTransfer.files);
                  }
                }}
                className={`flex flex-col justify-between rounded-xl border bg-card p-5 transition-all duration-200 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)] ${
                  isDraggingThis
                    ? 'border-primary bg-primary/10 ring-2 ring-primary'
                    : categoryDocs.length > 0
                    ? 'border-border'
                    : 'border-border/80 hover:border-primary/50'
                }`}
              >
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-feed text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <h3 className="font-mono text-xs font-bold tracking-wider text-foreground">
                        {cat.title}
                      </h3>
                    </div>

                    <span className="font-mono text-[10px] text-muted-foreground">
                      {cat.formats}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {cat.description}
                  </p>

                  {/* Uploading Status Indicator */}
                  {isUploadingThisCat && (
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5 font-mono text-xs">
                      <div className="flex items-center gap-2 text-primary">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span className="font-bold">Uploading to RAG Engine...</span>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {statusInfo.fileName}
                      </p>
                    </div>
                  )}

                  {/* Completed Success Indicator */}
                  {isCompletedThisCat && (
                    <div className="mt-3 rounded-lg border border-success/30 bg-success/10 p-2.5 flex items-center gap-2 font-mono text-xs text-success">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="truncate font-semibold">{statusInfo.fileName} ✓ Ingested</span>
                    </div>
                  )}

                  {/* Error Indicator with Retry */}
                  {isFailedThisCat && (
                    <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-2 font-mono text-xs text-destructive">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Upload Failed</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {statusInfo.error || 'Failed to upload document'}
                      </p>
                      <button
                        type="button"
                        onClick={() => triggerCategoryUpload(cat.type)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {/* Uploaded Documents List inside the category card */}
                  {categoryDocs.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Ingested ({categoryDocs.length})
                      </p>
                      {categoryDocs.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-surface-feed p-2 font-mono text-xs"
                        >
                          <div className="min-w-0 truncate">
                            <span className="flex items-center gap-1.5 truncate text-foreground font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                              <span className="truncate">{f.filename}</span>
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {Number(f.page_count || 0)}p · {Number(f.chunk_count || 0)} chunks · {Number(f.embedded_count || 0)} emb
                            </span>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold uppercase text-success">
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* The Functional Category Upload Button */}
                <div className="mt-5 border-t border-border/50 pt-3">
                  <button
                    type="button"
                    onClick={() => triggerCategoryUpload(cat.type)}
                    disabled={isUploadingThisCat}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-border bg-surface-feed px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingThisCat ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        <span>Upload {cat.title.toLowerCase()}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
