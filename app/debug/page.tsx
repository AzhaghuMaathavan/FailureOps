'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Database, Loader2, Server, UploadCloud } from 'lucide-react';
import {
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  OrgStatusPill,
  orgPrimaryBtnClass,
  orgSecondaryBtnClass,
} from '@/components/layout/OrgShell';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';

type HealthState = 'unknown' | 'ok' | 'error';

interface FoundationDoc {
  id: string;
  filename: string;
  status: string;
  chunk_count?: number;
  embedded_count?: number;
  error_message?: string | null;
}

interface RagSource {
  document?: string;
  page?: number | null;
  chunk_id?: string;
}

export default function FoundationDebugPage() {
  const { project } = useApp();
  const projectId = project?.id || 'aurora';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLTextAreaElement>(null);

  const [backend, setBackend] = useState<HealthState>('unknown');
  const [database, setDatabase] = useState<HealthState>('unknown');
  const [backendDetail, setBackendDetail] = useState('Checking…');
  const [databaseDetail, setDatabaseDetail] = useState('Checking…');
  const [documents, setDocuments] = useState<FoundationDoc[]>([]);
  const [query, setQuery] = useState('What evidence indicates increasing deployment instability?');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<RagSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  const showError = (message: string) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const refresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [backendHealth, dbHealth, docs] = await Promise.all([
        apiClient.getBackendHealth().catch((err: Error) => {
          setBackend('error');
          setBackendDetail(err.message);
          throw err;
        }),
        apiClient.getDatabaseHealth().catch((err: Error) => {
          setDatabase('error');
          setDatabaseDetail(err.message);
          return null;
        }),
        apiClient.listFoundationDocuments(projectId).catch(() => []),
      ]);

      const reachable = backendHealth.backend?.reachable === true && backendHealth.backend.status === 'ok';
      setBackend(reachable || backendHealth.status === 'ok' ? 'ok' : 'error');
      setBackendDetail(reachable ? 'Backend reachable on the configured API URL' : backendHealth.backend?.status || backendHealth.status);

      if (dbHealth && dbHealth.database === 'connected' && dbHealth.status === 'ok') {
        setDatabase('ok');
        setDatabaseDetail(dbHealth.pgvector ? 'PostgreSQL connected, pgvector available' : 'PostgreSQL connected');
      } else if (dbHealth) {
        setDatabase('error');
        setDatabaseDetail(dbHealth.database || 'Database check failed');
      }

      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err: unknown) {
      setBackend('error');
      showError(err instanceof Error ? err.message : 'Unable to reach the backend.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [projectId]);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await apiClient.uploadFoundationDocument(projectId, file, true);
      if (result?.status && result.status !== 'COMPLETED') {
        showError(result.errorMessage || `Ingestion finished with status ${result.status}`);
      }
      await refresh();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onQuery = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      showError('Enter a question before running RAG.');
      queryRef.current?.focus();
      return;
    }
    setIsQuerying(true);
    setError(null);
    setAnswer('');
    setSources([]);
    try {
      const result = await apiClient.queryRag(projectId, trimmed);
      setAnswer(result.answer || '');
      setSources(result.sources || []);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'RAG query failed.');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <OrgShell>
      <OrgPageHeader
        eyebrow="Foundation pipeline"
        title="Backend, database, and RAG debug"
        description="Live connection checks, document ingest, and grounded retrieval. This screen does not redesign FailureOps — it proves Frontend → API → Postgres/pgvector → LLM."
        action={
          <button type="button" className={orgSecondaryBtnClass} onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            Refresh status
          </button>
        }
      />

      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          aria-labelledby="debug-error-title"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h2 id="debug-error-title" className="font-bold">
            There is a problem
          </h2>
          <p className="mt-1 font-mono text-xs">{error}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <OrgMetricCard
          label="Backend :8000"
          value={
            <span className="inline-flex items-center gap-2">
              <Server className="h-5 w-5" aria-hidden="true" />
              {backend === 'ok' ? 'Connected' : backend === 'error' ? 'Down' : '…'}
            </span>
          }
          hint={backendDetail}
          valueClassName={backend === 'ok' ? 'text-success' : backend === 'error' ? 'text-destructive' : 'text-muted-foreground'}
        />
        <OrgMetricCard
          label="PostgreSQL + pgvector"
          value={
            <span className="inline-flex items-center gap-2">
              <Database className="h-5 w-5" aria-hidden="true" />
              {database === 'ok' ? 'Connected' : database === 'error' ? 'Down' : '…'}
            </span>
          }
          hint={databaseDetail}
          valueClassName={database === 'ok' ? 'text-success' : database === 'error' ? 'text-destructive' : 'text-muted-foreground'}
        />
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Upload document</h2>
          <OrgStatusPill tone={documents.length ? 'success' : 'default'}>
            {documents.length} stored
          </OrgStatusPill>
        </div>
        <p className="text-xs text-muted-foreground">
          Files are sent to the backend API, chunked, embedded, and stored in pgvector. Project: {projectId}
        </p>
        <input
          ref={fileInputRef}
          id="foundation-upload"
          type="file"
          accept=".pdf,.txt,.md,.docx,.pptx,.xlsx,.csv,.json"
          className="sr-only"
          onChange={(event) => onUpload(event.target.files?.[0])}
        />
        <button
          type="button"
          className={orgPrimaryBtnClass}
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isUploading ? 'Ingesting…' : 'Choose file'}
        </button>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documents.length === 0 ? (
            <li className="px-3 py-4 text-xs text-muted-foreground">No documents ingested yet.</li>
          ) : (
            documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                <span className="truncate font-medium text-foreground">{doc.filename}</span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {doc.status} · {doc.chunk_count ?? 0} chunks · {doc.embedded_count ?? 0} vectors
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Query RAG</h2>
        <label htmlFor="foundation-query" className="text-xs font-medium text-muted-foreground">
          Question
        </label>
        <textarea
          ref={queryRef}
          id="foundation-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          aria-describedby={error ? 'debug-error-title' : undefined}
          className="w-full cursor-text rounded-[10px] border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="button" className={orgPrimaryBtnClass} onClick={onQuery} disabled={isQuerying}>
          {isQuerying ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {isQuerying ? 'Retrieving…' : 'Run query'}
        </button>
        {answer ? (
          <div className="space-y-2 rounded-lg border border-border bg-surface-feed p-4">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wide text-primary">Answer</p>
            <p className="text-sm leading-relaxed text-foreground">{answer}</p>
            <p className="text-[11px] font-mono font-bold uppercase tracking-wide text-primary">Sources</p>
            {sources.length === 0 ? (
              <p className="text-xs text-muted-foreground">No source references.</p>
            ) : (
              <ul className="space-y-1">
                {sources.map((source) => (
                  <li key={`${source.chunk_id}-${source.page}`} className="font-mono text-xs text-muted-foreground">
                    {source.document || 'unknown'}
                    {source.page != null ? ` · page ${source.page}` : ''}
                    {source.chunk_id ? ` · ${source.chunk_id}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </OrgShell>
  );
}
