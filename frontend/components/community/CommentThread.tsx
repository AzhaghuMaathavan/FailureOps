'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  CheckCircle2,
  Send,
  Building2,
  Calendar,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { CommunityComment, CommunityPost } from '@/types';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';

interface CommentThreadProps {
  post: CommunityPost;
  comments: CommunityComment[];
  onCommentAdded: (newComment: CommunityComment) => void;
  onAnswerAccepted: (commentId: string) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  post,
  comments,
  onCommentAdded,
  onAnswerAccepted,
}) => {
  const { user } = useApp();
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentVotes, setCommentVotes] = useState<Record<string, { count: number; voted: boolean }>>(
    comments.reduce((acc, c) => {
      acc[c.id] = { count: c.helpful_count || 0, voted: c.has_voted_helpful || false };
      return acc;
    }, {} as Record<string, { count: number; voted: boolean }>)
  );

  const isPostAuthor = user?.id === post.author_id;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const added = await apiClient.addCommunityComment(post.id, newCommentText.trim());
      onCommentAdded(added);
      setNewCommentText('');
      setCommentVotes((prev) => ({
        ...prev,
        [added.id]: { count: 0, voted: false },
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCommentHelpful = async (commentId: string) => {
    const current = commentVotes[commentId] || { count: 0, voted: false };
    const nextVoted = !current.voted;
    const nextCount = nextVoted ? current.count + 1 : Math.max(0, current.count - 1);

    setCommentVotes((prev) => ({
      ...prev,
      [commentId]: { count: nextCount, voted: nextVoted },
    }));

    try {
      await apiClient.toggleCommunityHelpful(post.id, commentId);
    } catch (err) {
      // Revert
      setCommentVotes((prev) => ({
        ...prev,
        [commentId]: current,
      }));
    }
  };

  const handleAcceptAnswer = async (commentId: string) => {
    if (!isPostAuthor) return;
    try {
      await apiClient.acceptCommunityAnswer(post.id, commentId);
      onAnswerAccepted(commentId);
    } catch (err: any) {
      alert(err.message || 'Failed to accept answer.');
    }
  };

  return (
    <section id="discussion" className="mt-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-foreground">
            Discussion & Responses ({comments.length})
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Knowledge shared under FailureOps Community Guidelines
        </span>
      </div>

      {/* Comment Input */}
      <form onSubmit={handleAddComment} className="rounded-xl border border-border bg-card p-4">
        <label htmlFor="comment-input" className="block text-xs font-semibold text-foreground mb-2">
          Share an operational observation, insight, or recovery question:
        </label>
        <textarea
          id="comment-input"
          rows={3}
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Describe your reasoning, similar failure patterns, or suggestions..."
          className="w-full rounded-lg border border-border bg-surface-feed p-3 text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Formatting: Plain text or Markdown snippets.
          </span>
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isSubmitting ? 'Posting...' : 'Post Response'}</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-feed/30 p-8 text-center">
          <MessageSquare className="mx-auto size-8 text-subtle mb-2" aria-hidden="true" />
          <h4 className="text-xs font-semibold text-foreground">No responses yet</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Be the first to share an insight or recovery suggestion for this experience.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => {
            const isAccepted = c.is_accepted || post.accepted_comment_id === c.id;
            const voteState = commentVotes[c.id] || { count: c.helpful_count || 0, voted: false };
            const formattedDate = c.created_at
              ? new Date(c.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '';

            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 transition-all duration-200 ${
                  isAccepted
                    ? 'border-emerald-500/40 bg-emerald-500/5 shadow-subtle'
                    : 'border-border bg-card'
                }`}
              >
                {/* Accepted Banner */}
                {isAccepted && (
                  <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Accepted Solution / Most Useful Response</span>
                  </div>
                )}

                {/* Comment Content */}
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-line mb-3">
                  {c.content}
                </div>

                {/* Footer details & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">{c.author_name}</span>
                    <span className="text-subtle">•</span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Building2 className="w-3 h-3 text-subtle" aria-hidden="true" />
                      <span>{c.organization_id}</span>
                    </span>
                    <span className="text-subtle">•</span>
                    <time dateTime={c.created_at} className="text-[11px]">
                      {formattedDate}
                    </time>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Accept button for author */}
                    {isPostAuthor && !isAccepted && (
                      <button
                        type="button"
                        onClick={() => handleAcceptAnswer(c.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Accept Solution</span>
                      </button>
                    )}

                    {/* Helpful button */}
                    <button
                      type="button"
                      onClick={() => handleToggleCommentHelpful(c.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        voteState.voted
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-surface-feed hover:bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${voteState.voted ? 'fill-primary' : ''}`} aria-hidden="true" />
                      <span>{voteState.count}</span>
                      <span className="hidden sm:inline">Helpful</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
