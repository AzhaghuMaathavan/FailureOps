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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Grounded Project RAG
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Citation-Backed
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Ask the Evidence Base
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Question uploaded project documents with hybrid retrieval. Answers stay grounded in citations or refuse when evidence is missing.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
        className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-3"
      >
        <label htmlFor="ask-query" className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          Question against indexed project documents
        </label>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            ref={inputRef}
            id="ask-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What onboarding step causes the largest drop-off?"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'ask-error' : undefined}
            className="w-full px-4 py-3 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary font-medium"
          />
          <button
            type="submit"
            disabled={isAsking || !query.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-wider uppercase transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
          >
            {isAsking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Retrieving...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
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
            className="text-xs text-rose-400 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground text-[11px] font-mono">Suggested:</span>
          {SUGGESTED_QUESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                setQuery(text);
                ask(text);
              }}
              className="px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border/70 text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors cursor-pointer"
            >
              {text}
            </button>
          ))}
        </div>
      </form>

      {turns.length === 0 && !isAsking ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto opacity-60" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">No grounded answers yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Upload project documents, then ask a specific operational question. The engine will cite retrieved chunks or report that no evidence was found.
          </p>
          <Link
            href={`/projects/${projectId}/upload`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold cursor-pointer"
          >
            <span>Upload Evidence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4" aria-live="polite">
          {isAsking && turns.length === 0 && (
            <div className="p-6 rounded-2xl bg-card border border-border/80 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Retrieving grounded evidence...
            </div>
          )}
          {turns.map((turn) => (
            <article key={turn.id} className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary">{turn.query}</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{turn.answer}</p>
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                {turn.evidenceState && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-feed border border-border text-muted-foreground">
                    {turn.evidenceState}
                  </span>
                )}
                {turn.domainState && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-feed border border-border text-muted-foreground">
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
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-surface-feed border border-border text-primary hover:border-primary/50 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" aria-hidden="true" />
                      {c.filename || 'Source document'}
                    </Link>
                  ))
                )}
              </div>
              {turn.hits.length > 0 && (
                <ul className="space-y-2">
                  {turn.hits.slice(0, 4).map((hit) => (
                    <li key={hit.id} className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
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
