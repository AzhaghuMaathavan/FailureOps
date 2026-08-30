'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MessageSquare,
  Sparkles,
  Loader2,
  FileText,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface KeyFact {
  metric: string;
  canonical?: string;
  baseline?: string;
  previous?: string | null;
  current: string;
  change: string;
  trend: string;
  source: string;
  rows?: number[];
}

interface AskTurn {
  id: string;
  query: string;
  answer: string;
  evidenceState?: string;
  domainState?: string;
  keyEvidence?: KeyFact[];
  citations: { filename?: string; documentId?: string; page?: number | null; rows?: number[] }[];
  hits: { id: string; filename: string; snippet: string; location: string | null }[];
  showExcerpts?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'Which metric declined first before the current failure pattern?',
  'What is the latest API P95 latency?',
  'Which metric deteriorated the most?',
  'Did API latency increase?',
  'What onboarding step causes the largest drop-off?',
  'What evidence supports the predicted failure risk?'
];

export default function EvidenceAskPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [query, setQuery] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleExcerpts = (turnId: string) => {
    setTurns((prev) =>
      prev.map((t) => (t.id === turnId ? { ...t, showExcerpts: !t.showExcerpts } : t))
    );
  };

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isAsking) return;
    setIsAsking(true);
    setError(null);
    try {
      const res = await apiClient.askProject(projectId, trimmed, conversationId);
      if (res.conversationId) setConversationId(res.conversationId);
      setTurns((prev) => [
        {
          id: `ask-${Date.now()}`,
          query: trimmed,
          answer: res.answer || 'No grounded answer was returned from the project knowledge base.',
          evidenceState: res.evidenceState,
          domainState: res.domainState,
          keyEvidence: res.keyEvidence || [],
          citations: (res.citations || []).map((c: any) => ({
            documentId: c.documentId,
            filename: c.filename || 'Project Document',
            page: c.page,
            rows: c.rows,
          })),
          hits: (res.hits || []).map((h: any) => ({
            id: h.id,
            filename: h.filename || 'Project Document',
            snippet: (h.snippet || '').slice(0, 300),
            location: h.location || null,
          })),
          showExcerpts: false,
        },
        ...prev,
      ]);
      setQuery('');
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err?.message || 'Unable to answer from uploaded project documents.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setIsAsking(false);
    }
  };

  const renderStatusBadge = (state?: string) => {
    if (!state || state === 'SUPPORTED' || state === 'FAST_PATH_SUFFICIENT' || state === 'SUFFICIENT_EVIDENCE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> Grounded with Citations
        </span>
      );
    }
    if (state === 'PARTIAL_EVIDENCE' || state === 'MAX_ITERATIONS_PARTIAL') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-400">
          <AlertCircle className="h-3 w-3" /> Partially Supported
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 font-mono text-[11px] text-slate-400">
        <Minus className="h-3 w-3" /> Insufficient Telemetry
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            GROUNDED RAG & TIME-SERIES INTELLIGENCE
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[28px]">
            Ask the Evidence Base
          </h1>
          <p className="max-w-xl text-[13px] text-muted-foreground">
            Query indexed operational telemetry, architecture specs, meeting notes, and incident reports. Answers are synthesized with citations and deterministic metric timelines.
          </p>
        </div>
        <span className="inline-flex h-fit items-center gap-1.5 rounded-full border border-primary/30 bg-surface-feed px-3 py-1 font-mono text-[11px] text-primary shadow-[0_0_12px_-3px_rgba(255,122,0,0.3)]">
          <Database className="h-3.5 w-3.5 text-primary" />
          Real-Time Evidence Grounding
        </span>
      </div>

      {/* Query Input Card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
        className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]"
      >
        <label htmlFor="ask-query" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Ask a Question Against Project Documents
        </label>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <input
            ref={inputRef}
            id="ask-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Which metric declined first before the current failure pattern?"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'ask-error' : undefined}
            className="w-full rounded-[10px] border border-border bg-surface-feed px-4 py-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={isAsking || !query.trim()}
            className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isAsking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Ask Question</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <p
            ref={errorRef}
            id="ask-error"
            role="alert"
            tabIndex={-1}
            className="rounded text-xs font-medium text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-mono text-[11px] text-muted-foreground">Suggested queries:</span>
          {SUGGESTED_QUESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                setQuery(text);
                ask(text);
              }}
              className="cursor-pointer rounded-lg border border-border bg-surface-feed px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {text}
            </button>
          ))}
        </div>
      </form>

      {/* Response Turns List */}
      {turns.length === 0 && !isAsking ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-12 text-center shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground opacity-60" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">No questions asked yet</h3>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
            Ask temporal, factual, or metric questions about project incidents. The engine evaluates time-series observations and cites supporting sources.
          </p>
          <Link
            href={`/projects/${projectId}/upload`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Upload Documents</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-5" aria-live="polite">
          {isAsking && turns.length === 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
              <span>Retrieving evidence and running structured time-series synthesis...</span>
            </div>
          )}
          {turns.map((turn) => (
            <article
              key={turn.id}
              className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]"
            >
              {/* Question Header & Status */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-3">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  {turn.query}
                </p>
                <div>{renderStatusBadge(turn.evidenceState)}</div>
              </div>

              {/* Direct Synthesized Answer */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Grounded Answer
                </h4>
                <div className="rounded-lg border border-primary/20 bg-surface-feed/70 p-4 text-sm font-medium leading-relaxed text-foreground shadow-inner">
                  {turn.answer}
                </div>
              </div>

              {/* Structured Key Evidence Table */}
              {turn.keyEvidence && turn.keyEvidence.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Deterministic Metric Observations
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-border bg-surface-feed">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Metric</th>
                          <th className="px-3 py-2">Baseline</th>
                          <th className="px-3 py-2">Previous</th>
                          <th className="px-3 py-2">Current</th>
                          <th className="px-3 py-2">Total Change</th>
                          <th className="px-3 py-2">Trend</th>
                          <th className="px-3 py-2">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {turn.keyEvidence.map((kf, idx) => (
                          <tr key={idx} className="hover:bg-card/50 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-foreground">
                              {kf.metric}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">
                              {kf.baseline || '—'}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">
                              {kf.previous || '—'}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-semibold text-foreground">
                              {kf.current}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold">
                              <span
                                className={
                                  kf.change.startsWith('+')
                                    ? 'text-amber-400'
                                    : kf.change.startsWith('-')
                                    ? 'text-rose-400'
                                    : 'text-muted-foreground'
                                }
                              >
                                {kf.change}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono">
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  kf.trend === 'INCREASING'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : kf.trend === 'DECREASING'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {kf.trend === 'INCREASING' ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : kf.trend === 'DECREASING' ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <Minus className="h-3 w-3" />
                                )}
                                {kf.trend}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-primary">
                              {kf.source}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Source Provenance Bar */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                <span className="font-mono text-[11px] font-bold text-muted-foreground">Sources:</span>
                {turn.citations.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">No specific document citations recorded.</span>
                ) : (
                  turn.citations.map((c, idx) => (
                    <a
                      key={`${c.documentId || c.filename || idx}`}
                      href={`/api/documents/${encodeURIComponent(c.documentId || c.filename || 'doc')}/download?projectId=${encodeURIComponent(projectId)}${c.page ? `#page=${c.page}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-feed px-2.5 py-1 font-mono text-[11px] text-primary hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                      title={`Open ${c.filename || 'Source Document'}`}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{c.filename || 'Source document'}</span>
                      {c.page ? <span className="text-[10px] text-muted-foreground">· p.{c.page}</span> : null}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  ))
                )}
              </div>

              {/* Collapsible Supporting Excerpts */}
              {turn.hits.length > 0 && (
                <div className="border-t border-border/40 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleExcerpts(turn.id)}
                    className="flex w-full cursor-pointer items-center justify-between py-1 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>
                      {turn.showExcerpts ? 'Hide supporting excerpts' : `View supporting evidence excerpts (${turn.hits.length})`}
                    </span>
                    {turn.showExcerpts ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {turn.showExcerpts && (
                    <div className="mt-2 space-y-2 rounded-lg border border-border/70 bg-surface-feed p-3">
                      {turn.hits.map((hit) => (
                        <div key={hit.id} className="rounded border border-border/50 bg-card/60 p-2.5 text-xs">
                          <div className="flex items-center justify-between font-mono text-[10px] text-primary pb-1">
                            <span className="font-bold">{hit.filename}</span>
                            {hit.location && <span className="text-muted-foreground">{hit.location}</span>}
                          </div>
                          <p className="line-clamp-3 text-muted-foreground leading-relaxed">
                            {hit.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
