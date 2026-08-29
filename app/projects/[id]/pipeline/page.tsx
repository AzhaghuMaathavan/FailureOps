'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Binary, Loader2, ArrowRight } from 'lucide-react';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { RagPipelinePanel } from '@/components/evidence/RagPipelinePanel';

export default function RagPipelinePage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [pipeline, setPipeline] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, h] = await Promise.all([
        apiClient.getRagPipeline(projectId),
        apiClient.getRagHealth().catch(() => null),
      ]);
      setPipeline(data);
      setHealth(h);
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Binary className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Observability
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            RAG Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Actual parser, chunk, embedding, retrieval, Evidence Agent, and Signal Agent counts from the RAG backend.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/upload`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold cursor-pointer"
        >
          <span>Upload evidence</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading && !pipeline ? (
        <div className="p-12 rounded-2xl bg-card border border-border flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Loading live RAG state...
        </div>
      ) : error && !pipeline ? (
        <div role="alert" tabIndex={-1} className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-3">
          <h2 id="pipeline-error-title" className="font-bold">RAG unavailable</h2>
          <p className="text-xs font-mono">{error}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : pipeline ? (
        <div className="space-y-6">
          <RagPipelinePanel
            projectId={projectId}
            stages={pipeline.stages}
            reachable={pipeline.health?.reachable !== false}
            database={pipeline.health?.database}
            rustfsReachable={pipeline.health?.rustfsReachable}
            rustfsProvider={pipeline.health?.rustfsProvider}
            compact={false}
          />

          <section className="p-6 rounded-2xl bg-card border border-border/80 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Service status</h2>
            <p className="text-xs text-muted-foreground" role="status" aria-atomic="true">
              RAG {health?.reachable ? 'reachable' : 'unreachable'}
              {' · '}Vector DB {health?.vectorStore ? 'connected' : 'unknown'}
              {' · '}RustFS {health?.rustfsReachable ? 'connected' : health?.rustfsProvider || 'not reported'}
              {' · '}Embeddings {health?.embeddingProviderConfigured ? 'configured' : 'missing'}
              {' · '}LLM {health?.llmProviderConfigured ? 'configured' : 'missing'}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
              <div>Latest analysis: {pipeline.analysisStatus || 'none'}</div>
              <div>Analysis ID: {pipeline.evidenceAnalysisId || 'none'}</div>
              <div>Storage bucket: {health?.rustfsBucket || pipeline.storageHealth?.bucket || 'n/a'}</div>
              <div>Evidence agent: {pipeline.metrics?.evidence_agent_status || 'not run'}</div>
              <div>Signal agent: {pipeline.metrics?.signal_agent_status || 'not run'}</div>
            </dl>
          </section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Documents', totals.documents],
              ['Bytes stored', totals.bytes ?? 0],
              ['Pages', totals.pages ?? 0],
              ['Chunks', totals.chunks],
              ['Embeddings', totals.embedded],
              ['Vectors', totals.vectors ?? totals.embedded],
              ['Retrieved', totals.retrieved ?? totals.chunksSearched],
              ['Evidence', totals.evidence],
              ['Signals', totals.signals],
            ].map(([label, value]) => (
              <div key={String(label)} className="p-4 rounded-xl bg-card border border-border">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">{label}</p>
                <p className="text-xl font-extrabold font-mono text-foreground mt-1">{value}</p>
              </div>
            ))}
          </div>

          {Array.isArray(pipeline.documents) && pipeline.documents.length > 0 && (
            <section className="p-6 rounded-2xl bg-card border border-border/80 space-y-3">
              <h2 className="text-sm font-bold text-foreground">Documents</h2>
              <ul className="space-y-3">
                {pipeline.documents.map((doc: any) => (
                  <li key={doc.document_id} className="text-xs font-mono text-muted-foreground border border-border rounded-xl p-3">
                    <p className="text-foreground font-bold">{doc.filename}</p>
                    <p>
                      Type: {doc.document_type || 'PROJECT_DOC'} · Size: {doc.file_size} B · Storage: {doc.storage?.provider}
                      {doc.storage?.exists ? ' ✓' : ' missing'}
                    </p>
                    <p>
                      Pages: {doc.page_count} · Chunks: {doc.chunk_count} · Embeddings: {doc.embedded_count} · Vectors: {doc.vector_count}
                    </p>
                    <p>Status: {doc.status}</p>
                    {doc.error_message && (
                      <p role="alert" className="text-rose-400">Reason: {doc.error_message}</p>
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
