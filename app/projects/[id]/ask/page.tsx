'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageSquare, Sparkles, Loader2, FileText, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface AskTurn {
  id: string;
  query: string;
  answer: string;
  evidenceState?: string;
  domainState?: string;
  citations: { filename?: string; documentId?: string }[];
  hits: { id: string; filename: string; snippet: string; location: string | null }[];
}

const SUGGESTED_QUESTIONS = [
  'What onboarding step causes the largest drop-off?',
  'Which metric declined first before the current failure pattern?',
  'What evidence supports the predicted next failure?',
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
          citations: res.citations || [],
          hits: (res.hits || []).map((h: any) => ({
            id: h.id,
            filename: h.filename || 'Project Document',
            snippet: h.snippet || '',
            location: h.location || null,
          })),
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            GROUNDED PROJECT RAG
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[28px]">
            Ask the Evidence Base
          </h1>
          <p className="max-w-xl text-[13px] text-muted-foreground">
            Question uploaded project documents with hybrid retrieval. Answers stay grounded in citations or refuse when evidence is missing.
          </p>
        </div>
        <span className="inline-flex h-fit rounded-full border border-info/30 bg-surface-feed px-2 py-0.5 font-mono text-[10px] text-info">
          Citation-Backed
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
        className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]"
      >
        <label htmlFor="ask-query" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Question against indexed project documents
        </label>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <input
            ref={inputRef}
            id="ask-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What onboarding step causes the largest drop-off?"
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
                <span>Retrieving...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Ask</span>
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
          <span className="font-mono text-[11px] text-muted-foreground">Suggested:</span>
          {SUGGESTED_QUESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                setQuery(text);
                ask(text);
              }}
              className="cursor-pointer rounded-lg border border-border bg-surface-feed px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {text}
            </button>
          ))}
        </div>
      </form>

      {turns.length === 0 && !isAsking ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-12 text-center shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground opacity-60" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">No grounded answers yet</h3>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
            Upload project documents, then ask a specific operational question. The engine will cite retrieved chunks or report that no evidence was found.
          </p>
          <Link
            href={`/projects/${projectId}/upload`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Upload Evidence</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4" aria-live="polite">
          {isAsking && turns.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Retrieving grounded evidence...
            </div>
          )}
          {turns.map((turn) => (
            <article
              key={turn.id}
              className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]"
            >
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">{turn.query}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{turn.answer}</p>
              <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                {turn.evidenceState && (
                  <span className="rounded border border-border bg-surface-feed px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {turn.evidenceState}
                  </span>
                )}
                {turn.domainState && (
                  <span className="rounded border border-border bg-surface-feed px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {turn.domainState}
                  </span>
                )}
                {turn.citations.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">No document citations attached.</span>
                ) : (
                  turn.citations.map((c, idx) => (
                    <Link
                      key={`${c.documentId || c.filename || idx}`}
                      href={`/projects/${projectId}/evidence`}
                      className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface-feed px-2 py-0.5 font-mono text-[11px] text-primary hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <FileText className="h-3 w-3" aria-hidden="true" />
                      {c.filename || 'Source document'}
                    </Link>
                  ))
                )}
              </div>
              {turn.hits.length > 0 && (
                <ul className="space-y-2">
                  {turn.hits.slice(0, 4).map((hit) => (
                    <li key={hit.id} className="border-l-2 border-primary/30 pl-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-mono text-[10px] text-foreground">{hit.filename}</span>
                      {hit.location ? <span className="ml-2">{hit.location}</span> : null}
                      {hit.snippet ? <p className="mt-1 text-muted-foreground">{hit.snippet}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
