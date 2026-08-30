'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Binary, Loader2, ArrowRight } from 'lucide-react';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { RagPipelinePanel } from '@/components/evidence/RagPipelinePanel';
import { KpiStat } from '@/components/evidence/KpiStat';
import { LangGraphRunPanel, LangGraphRunView } from '@/components/pipeline/LangGraphRunPanel';

export default function RagPipelinePage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [pipeline, setPipeline] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [langGraphRun, setLangGraphRun] = useState<LangGraphRunView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, h, run] = await Promise.all([
        apiClient.getRagPipeline(projectId),
        apiClient.getRagHealth().catch(() => null),
        apiClient.getLatestLangGraphRun(projectId).catch(() => null),
      ]);
      setPipeline(data);
      setHealth(h);
      if (run) setLangGraphRun(run);
    } catch (err: unknown) {
      setPipeline(null);
      setError(isRagUnavailable(err) ? 'RAG unavailable' : err instanceof Error ? err.message : 'Unable to load pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [projectId]);

  const totals = pipeline?.totals || {};

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Binary className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
              OBSERVABILITY
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[28px]">
            Pipeline Health
          </h1>
          <p className="max-w-xl text-[13px] text-muted-foreground">
            Actual parser, chunk, embedding, retrieval, Evidence Agent, and Signal Agent counts from the RAG backend.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/upload`}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Upload evidence</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {isLoading && !pipeline ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Loading live RAG state...
        </div>
      ) : error && !pipeline ? (
        <div role="alert" tabIndex={-1} className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          <h2 id="pipeline-error-title" className="font-bold">RAG unavailable</h2>
          <p className="font-mono text-xs">{error}</p>
          <button
            type="button"
            onClick={load}
            className="cursor-pointer rounded-[10px] border border-destructive/40 bg-destructive/20 px-4 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retry
          </button>
        </div>
      ) : pipeline ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiStat label="Documents" value={totals.documents ?? 0} hint="Stored" valueClassName="text-info" />
            <KpiStat label="Chunks" value={totals.chunks ?? 0} hint="Parsed" valueClassName="text-foreground" />
            <KpiStat label="Embeddings" value={totals.embedded ?? 0} hint="Indexed" valueClassName="text-success" />
            <KpiStat
              label="Evidence"
              value={totals.evidence ?? 0}
              hint={`${totals.signals ?? 0} signals`}
              valueClassName="text-primary"
            />
          </div>

          {langGraphRun && <LangGraphRunPanel run={langGraphRun} />}

          <RagPipelinePanel
            projectId={projectId}
            stages={pipeline.stages}
            reachable={pipeline.health?.reachable !== false}
            database={pipeline.health?.database}
            rustfsReachable={pipeline.health?.rustfsReachable}
            rustfsProvider={pipeline.health?.rustfsProvider}
            compact={false}
          />

          <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
            <h2 className="text-sm font-bold text-foreground">Service status</h2>
            <p className="text-xs text-muted-foreground" role="status" aria-atomic="true">
              RAG {health?.reachable ? 'reachable' : 'unreachable'}
              {' · '}Vector DB {health?.vectorStore ? 'connected' : 'unknown'}
              {' · '}RustFS {health?.rustfsReachable ? 'connected' : health?.rustfsProvider || 'not reported'}
              {' · '}Embeddings {health?.embeddingProviderConfigured ? 'configured' : 'missing'}
              {' · '}LLM {health?.llmProviderConfigured ? 'configured' : 'missing'}
            </p>
            <dl className="grid grid-cols-1 gap-2 font-mono text-[11px] text-muted-foreground sm:grid-cols-2">
              <div>Latest analysis: {pipeline.analysisStatus || 'none'}</div>
              <div>Analysis ID: {pipeline.evidenceAnalysisId || 'none'}</div>
              <div>Storage bucket: {health?.rustfsBucket || pipeline.storageHealth?.bucket || 'n/a'}</div>
              <div>Evidence agent: {pipeline.metrics?.evidence_agent_status || 'not run'}</div>
              <div>Signal agent: {pipeline.metrics?.signal_agent_status || 'not run'}</div>
            </dl>
          </section>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Bytes stored', totals.bytes ?? 0],
              ['Pages', totals.pages ?? 0],
              ['Vectors', totals.vectors ?? totals.embedded],
              ['Retrieved', totals.retrieved ?? totals.chunksSearched],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 font-mono text-xl font-extrabold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {Array.isArray(pipeline.documents) && pipeline.documents.length > 0 && (
            <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
              <h2 className="text-sm font-bold text-foreground">Documents</h2>
              <ul className="space-y-2">
                {pipeline.documents.map((doc: any) => (
                  <li
                    key={doc.document_id}
                    className="rounded-[10px] border border-border bg-surface-feed px-3.5 py-3 font-mono text-xs text-muted-foreground"
                  >
                    <p className="text-[13px] font-semibold text-foreground">{doc.filename}</p>
                    <p>
                      Type: {doc.document_type || 'PROJECT_DOC'} · Size: {doc.file_size} B · Storage: {doc.storage?.provider}
                      {doc.storage?.exists ? ' ✓' : ' missing'}
                    </p>
                    <p>
                      Pages: {doc.page_count} · Chunks: {doc.chunk_count} · Embeddings: {doc.embedded_count} · Vectors: {doc.vector_count}
                    </p>
                    <p>Status: {doc.status}</p>
                    {doc.error_message && (
                      <p role="alert" className="text-destructive">Reason: {doc.error_message}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
