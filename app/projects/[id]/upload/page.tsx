'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  Users,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Trash2,
  Plus,
  FileCheck,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { EvidenceSourceType } from '@/types';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';

interface PendingFileItem {
  id: string;
  file: File;
  category: EvidenceSourceType;
}

export default function EvidenceUploadPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const { project } = useApp();

  const [backendDocs, setBackendDocs] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [replacingPendingId, setReplacingPendingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [currentCategory, setCurrentCategory] = useState<EvidenceSourceType>('PRODUCT_PLAN');

  // Categories config for file classification
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

  const fetchBackendDocuments = async () => {
    try {
      setIsLoadingDocs(true);
      const docs = await apiClient.listDocuments(projectId);
      setBackendDocs(docs || []);
    } catch (err: any) {
      console.error('Failed to load project documents:', err);
      setBackendDocs([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchBackendDocuments();
  }, [projectId]);

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const newItems: PendingFileItem[] = Array.from(selected).map(file => ({
      id: `pending_${Math.random().toString(36).substring(2, 9)}`,
      file,
      category: currentCategory,
    }));

    setPendingFiles(prev => [...prev, ...newItems]);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !replacingPendingId) return;

    setPendingFiles(prev =>
      prev.map(item =>
        item.id === replacingPendingId
          ? { ...item, file: selected }
          : item
      )
    );
    setReplacingPendingId(null);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => prev.filter(item => item.id !== id));
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
      for (const item of pendingFiles) {
        await apiClient.uploadProjectFile(
          projectId,
          item.file,
          item.file.name,
          item.category
        );
      }
      setPendingFiles([]);
      await fetchBackendDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'One or more files failed to upload.');
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

  return (
    <div className="space-y-8">
      {/* Hidden file inputs */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Step 2 of Intelligence Setup
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-feed border border-border text-muted-foreground">
              {project.company || 'Enterprise'} / {project.name || projectId}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {totalUploaded} Document{totalUploaded === 1 ? '' : 's'} Stored
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Build the Evidence Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload the real fragmented project evidence FailureOps will continuously reason over to discover weak failure seeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => triggerAddForCategory('PRODUCT_PLAN')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-card hover:bg-surface-feed border border-border text-xs font-mono font-bold text-foreground transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>Add Files</span>
          </button>

          <button
            onClick={() => router.push(`/projects/${projectId}/analysis`)}
            disabled={totalUploaded < 1 || isUploading}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer ${
              totalUploaded >= 1 && !isUploading
                ? 'bg-primary hover:bg-primary-hover text-white shadow-[0_0_20px_-3px_rgba(255,122,0,0.5)]'
                : 'bg-surface-feed text-muted-foreground/50 border border-border cursor-not-allowed opacity-50'
            }`}
          >
            <span>ANALYZE PROJECT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">✕</button>
        </div>
      )}

      {/* Pending Files Staging Area (Selected but not yet uploaded) */}
      {pendingFiles.length > 0 && (
        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/30 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Selected Evidence Staging ({pendingFiles.length} pending file{pendingFiles.length === 1 ? '' : 's'})
              </h3>
            </div>
            <button
              onClick={handleUploadAllPending}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold font-mono transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to RAG Engine...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload & Ingest All Files</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {pendingFiles.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80 text-xs"
              >
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="font-bold text-foreground truncate block">{item.file.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatFileSize(item.file.size)} • Type: {item.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => triggerReplacePending(item.id)}
                    disabled={isUploading}
                    className="px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => removePendingFile(item.id)}
                    disabled={isUploading}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-mono text-rose-400 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persisted Uploaded Documents in Backend */}
      {backendDocs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
              Persisted Evidence Documents ({backendDocs.length})
            </h3>
            <button
              onClick={fetchBackendDocuments}
              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDocs ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backendDocs.map(doc => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-card border border-border/80 hover:border-border transition-all flex items-start justify-between gap-3 shadow-sm"
              >
                <div className="flex items-start gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-surface-feed border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-foreground truncate">{doc.filename}</h4>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      Type: <span className="text-foreground">{doc.document_type || 'PROJECT_DOC'}</span> • Chunks: <span className="text-foreground font-bold">{doc.chunk_count || 0}</span>
                      {typeof doc.embedded_count === 'number' && (
                        <> • Embedded: <span className="text-foreground font-bold">{doc.embedded_count}</span></>
                      )}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {doc.status || 'INDEXED'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteBackendDoc(doc.id)}
                  disabled={deletingDocId === doc.id}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  title="Delete document and remove associated chunks"
                >
                  {deletingDocId === doc.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Upload Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
          Evidence Categories & File Classification
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map(cat => {
            const Icon = cat.icon;
            const categoryDocs = backendDocs.filter(d => d.document_type === cat.type);

            return (
              <div
                key={cat.type}
                className={`p-6 rounded-2xl bg-card border transition-all duration-200 flex flex-col justify-between ${
                  categoryDocs.length > 0
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

                  {categoryDocs.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {categoryDocs.map(f => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-feed border border-border/70 text-xs font-mono"
                        >
                          <span className="text-foreground flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {f.filename}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-border/50">
                  <button
                    onClick={() => triggerAddForCategory(cat.type)}
                    disabled={isUploading}
                    className="w-full py-2 px-3 rounded-xl bg-surface-feed hover:bg-card border border-border hover:border-primary/50 text-xs font-semibold text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-primary" />
                    <span>Upload {cat.title.toLowerCase()}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State when no documents are uploaded */}
      {!isLoadingDocs && backendDocs.length === 0 && pendingFiles.length === 0 && (
        <div className="p-12 rounded-2xl bg-card border border-border/80 text-center space-y-4">
          <UploadCloud className="w-12 h-12 text-primary mx-auto opacity-70" />
          <h3 className="text-base font-bold text-foreground">No Evidence Uploaded Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Upload the documents that describe your product architecture, operational metrics, and team performance to build the empirical evidence base.
          </p>
          <button
            onClick={() => triggerAddForCategory('PRODUCT_PLAN')}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-md"
          >
            Select Evidence Files
          </button>
        </div>
      )}
    </div>
  );
}

