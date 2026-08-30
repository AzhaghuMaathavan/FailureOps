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
} from 'lucide-react';
import { EvidenceSourceType } from '@/types';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';
import { RagPipelinePanel } from '@/components/evidence/RagPipelinePanel';
import { KpiStat } from '@/components/evidence/KpiStat';
import { LangGraphRunPanel, LangGraphRunView } from '@/components/pipeline/LangGraphRunPanel';

interface PendingFileItem {
  id: string;
  file: File;
  category: EvidenceSourceType;
  title: string;
  description: string;
  visibility: 'PRIVATE' | 'ORGANIZATION';
  department: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const [langGraphRun, setLangGraphRun] = useState<LangGraphRunView | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [currentCategory, setCurrentCategory] = useState<EvidenceSourceType>('PRODUCT_PLAN');

  const categories: { type: EvidenceSourceType; title: string; description: string; formats: string; icon: any }[] = [
    {
      type: 'PRODUCT_PLAN',
      title: 'PRODUCT PLAN',
      description: 'Roadmaps, PRDs, project plans, feature specs, and hard release milestones.',
      formats: 'PDF, DOCX, MD',
      icon: FileText,
    },
    {
      type: 'CUSTOMER_FEEDBACK',
      title: 'CUSTOMER FEEDBACK',
      description: 'Surveys, qualitative interviews, onboarding drop-off tickets, and NPS reviews.',
      formats: 'CSV, JSON, TXT',
      icon: Users,
    },
    {
      type: 'PRODUCT_METRICS',
      title: 'PRODUCT METRICS',
      description: 'User activation, retention curves, trial conversion, and churn telemetry.',
      formats: 'CSV, XLSX',
      icon: FileSpreadsheet,
    },
    {
      type: 'ENGINEERING_METRICS',
      title: 'ENGINEERING METRICS',
      description: 'CI/CD deployment breakages, P1 bug backlog, MTTR, and build pipeline logs.',
      formats: 'CSV, JSON',
      icon: FileCode,
    },
    {
      type: 'TEAM_OPERATIONS',
      title: 'TEAM OPERATIONS',
      description: 'PR review latencies, sprint workload, engineer overtime, and context switching.',
      formats: 'CSV, JSON',
      icon: Cpu,
    },
    {
      type: 'INCIDENT_REPORTS',
      title: 'INCIDENT REPORTS',
      description: 'Production postmortems, staging deadlocks, migration rollbacks, and retros.',
      formats: 'PDF, MD, TXT',
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

  const stageSelectedFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const newItems: PendingFileItem[] = list.map((file) => ({
      id: `pending_${Math.random().toString(36).substring(2, 9)}`,
      file,
      category: currentCategory,
      title: file.name.replace(/\.[^.]+$/, ''),
      description: '',
      visibility: 'PRIVATE',
      department: '',
    }));
    setPendingFiles((prev) => [...prev, ...newItems]);
    setUploadError(null);
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    stageSelectedFiles(selected);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const triggerAddForCategory = (cat: EvidenceSourceType) => {
    setCurrentCategory(cat);
    if (fileInputRef.current) fileInputRef.current.click();
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
    } catch (err: any) {
      setUploadError(err.message || 'LangGraph upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBackendDoc = async (docId: string) => {
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelectFiles}
        className="hidden"
        multiple
        accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.md,.json"
      />
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceFile}
        className="hidden"
        accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.md,.json"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            EVIDENCE INTAKE & NORMALIZATION
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[28px]">
            Build Your Project Intelligence
          </h1>
          <p className="max-w-xl text-[13px] text-muted-foreground">
            Drop PRDs, feedback, sprint exports, and traces into your isolated enclave. Nothing leaves encrypted storage.
          </p>

          <p className="font-mono text-[10px] text-muted-foreground">
            {project.company || 'Enterprise'} / {project.name || projectId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => triggerAddForCategory(currentCategory)}
            className="inline-flex cursor-pointer items-center rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Select files
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

      <button
        type="button"
        onClick={() => triggerAddForCategory(currentCategory)}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) stageSelectedFiles(e.dataTransfer.files);
        }}
        className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-solid py-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isDragging ? 'border-primary bg-primary/10' : 'border-primary bg-surface-feed'
        }`}
      >
        <p className="text-base font-semibold text-foreground">Drop files or paste a workspace export</p>
        <p className="text-xs text-muted-foreground">PDF, CSV, JSON, SARIF, Jira export  ·  AES-256 at rest</p>
      </button>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat label="Queued" value={queuedCount} hint="Scanning" valueClassName="text-info" />
        <KpiStat label="Ready" value={readyCount} hint="Cited" valueClassName="text-success" />
        <KpiStat label="Rejected" value={rejectedCount} hint="Policy" valueClassName="text-muted-foreground" />
        <KpiStat label="Quota" value={formatFileSize(quotaBytes)} hint="Enclave" valueClassName="text-primary" />
      </div>

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
                  <label className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">Visibility</span>
                    <select
                      value={item.visibility}
                      onChange={(e) =>
                        setPendingFiles((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? { ...row, visibility: e.target.value as PendingFileItem['visibility'] }
                              : row
                          )
                        )
                      }
                      className="w-full cursor-pointer rounded-lg border border-border bg-surface-feed px-2.5 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="ORGANIZATION">Organization</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">Department</span>
                    <input
                      value={item.department}
                      onChange={(e) =>
                        setPendingFiles((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, department: e.target.value } : row))
                        )
                      }
                      className="w-full cursor-text rounded-lg border border-border bg-surface-feed px-2.5 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="block space-y-1 md:col-span-2">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">Description</span>
                    <textarea
                      value={item.description}
                      onChange={(e) =>
                        setPendingFiles((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, description: e.target.value } : row))
                        )
                      }
                      rows={2}
                      className="w-full cursor-text rounded-lg border border-border bg-surface-feed px-2.5 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {langGraphRun && <LangGraphRunPanel run={langGraphRun} />}

      {pipeline && !ragUnavailable && (
        <RagPipelinePanel
          projectId={projectId}
          stages={pipeline.stages}
          reachable
          database={pipeline.health?.database}
          rustfsReachable={pipeline.health?.rustfsReachable}
          rustfsProvider={pipeline.health?.rustfsProvider}
        />
      )}
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
                      Type: <span className="text-foreground">{doc.document_type || 'PROJECT_DOC'}</span>
                      {' '}• Size: <span className="font-bold text-foreground">{Number(doc.file_size ?? 0)} B</span>
                      {' '}• Storage: <span className="font-bold text-foreground">{doc.storage_provider || doc.storage?.provider || 'unknown'}{doc.file_exists || doc.storage?.exists ? ' ✓' : ''}</span>
                      {' '}• Pages: <span className="font-bold text-foreground">{Number(doc.page_count ?? 0)}</span>
                      {' '}• Chunks: <span className="font-bold text-foreground">{Number(doc.chunk_count ?? 0)}</span>
                      {' '}• Embedded: <span className="font-bold text-foreground">{Number(doc.embedded_count ?? 0)}</span>
                      {' '}• Vectors: <span className="font-bold text-foreground">{Number(doc.embedded_count ?? 0)}</span>
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
                  onClick={() => handleDeleteBackendDoc(doc.id)}
                  disabled={deletingDocId === doc.id}
                  className="shrink-0 cursor-pointer rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  title="Delete document and remove associated chunks"
                  aria-label={`Delete ${doc.filename}`}
                >
                  {deletingDocId === doc.id ? (
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

      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Evidence Categories & File Classification
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const categoryDocs = backendDocs.filter((d) => d.document_type === cat.type);

            return (
              <div
                key={cat.type}
                className={`flex flex-col justify-between rounded-xl border bg-card p-5 transition-colors duration-200 ${
                  categoryDocs.length > 0
                    ? 'border-border shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]'
                    : 'border-dashed border-border hover:border-primary/40'
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

                  {categoryDocs.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {categoryDocs.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-surface-feed p-2 font-mono text-xs"
                        >
                          <span className="flex items-center gap-1.5 truncate text-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                            {f.filename}
                          </span>
                          <span className="text-[10px] font-semibold uppercase text-success">
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-border/50 pt-3">
                  <button
                    type="button"
                    onClick={() => triggerAddForCategory(cat.type)}
                    disabled={isUploading}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-border bg-surface-feed px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Upload {cat.title.toLowerCase()}</span>
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
