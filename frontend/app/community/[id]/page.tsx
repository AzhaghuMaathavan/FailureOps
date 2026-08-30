'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Building2,
  Calendar,
  Tag,
  Dna,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { PostTypeBadge } from '@/components/community/PostTypeBadge';
import { CommunityPrivacyBadge } from '@/components/community/CommunityPrivacyBadge';
import { CommentThread } from '@/components/community/CommentThread';
import { apiClient } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';
import { CommunityPost, CommunityComment } from '@/types';

export default function CommunityPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useApp();
  const postId = params.id as string;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helpful state
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setIsLoading(true);
    apiClient
      .getCommunityPost(postId)
      .then((data) => {
        setPost(data);
        setComments(data.comments || []);
        setHelpfulCount(data.helpful_count || 0);
        setHasVoted(data.has_voted_helpful || false);
      })
      .catch((err) => {
        setError(err.message || 'Unable to retrieve post.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [postId]);

  const handleToggleHelpful = async () => {
    if (!post || isVoting) return;
    setIsVoting(true);
    const nextVoted = !hasVoted;
    const nextCount = nextVoted ? helpfulCount + 1 : Math.max(0, helpfulCount - 1);
    setHasVoted(nextVoted);
    setHelpfulCount(nextCount);

    try {
      const res = await apiClient.toggleCommunityHelpful(post.id);
      setHasVoted(res.voted);
    } catch {
      setHasVoted(!nextVoted);
      setHelpfulCount(helpfulCount);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm('Are you sure you want to delete this community post?')) return;

    try {
      await apiClient.deleteCommunityPost(post.id);
      router.push('/community');
    } catch (err: any) {
      alert(err.message || 'Failed to delete post.');
    }
  };

  const handleCommentAdded = (newComment: CommunityComment) => {
    setComments((prev) => [...prev, newComment]);
    if (post) {
      setPost({ ...post, comment_count: (post.comment_count || 0) + 1 });
    }
  };

  const handleAnswerAccepted = (commentId: string) => {
    if (post) {
      setPost({ ...post, accepted_comment_id: commentId });
    }
    setComments((prev) =>
      prev.map((c) => ({
        ...c,
        is_accepted: c.id === commentId,
      }))
    );
  };

  const isAuthor = user?.id === post?.author_id;

  const formattedDate = post?.created_at
    ? new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="flex-1 px-4 py-6 lg:px-8 max-w-5xl w-full mx-auto space-y-6 pb-20">
          {/* Back Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Community Hub</span>
            </Link>

            {isAuthor && post && (
              <button
                type="button"
                onClick={handleDeletePost}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete Experience</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-10 w-2/3 rounded-lg bg-card/60 animate-pulse" />
              <div className="h-64 rounded-xl bg-card/40 animate-pulse" />
            </div>
          ) : error || !post ? (
            <div className="rounded-2xl border border-destructive/40 bg-card p-12 text-center">
              <AlertTriangle className="mx-auto size-10 text-destructive mb-3" aria-hidden="true" />
              <h2 className="text-base font-bold text-foreground">Post Not Found</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {error || 'This post may have been removed or is restricted by tenant privacy rules.'}
              </p>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors"
              >
                Return to Community
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Post Header Card */}
              <article className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5 shadow-subtle">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PostTypeBadge type={post.post_type} size="md" />
                    <CommunityPrivacyBadge visibility={post.visibility} />
                    {post.accepted_comment_id && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Resolved Outcome</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-subtle" aria-hidden="true" />
                    <time dateTime={post.created_at}>{formattedDate}</time>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  {post.title}
                </h1>

                {/* Summary */}
                <p className="text-sm font-medium text-foreground/80 leading-relaxed bg-surface-feed/60 border border-border/80 rounded-xl p-4">
                  {post.summary}
                </p>

                {/* FailureOps Empirical Intelligence Breakdown */}
                {(post.failure_dimension || post.pattern || post.observed_failure || post.recovery_strategy || post.verified_outcome) && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      <span>FailureOps Grounded Intelligence Analysis</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {post.failure_dimension && (
                        <div className="rounded-lg bg-card/80 border border-border p-3">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">Failure Dimension</span>
                          <p className="font-bold text-foreground mt-0.5">{post.failure_dimension}</p>
                        </div>
                      )}
                      {post.pattern && (
                        <div className="rounded-lg bg-card/80 border border-border p-3">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">Observed Pattern</span>
                          <p className="font-bold text-foreground mt-0.5">{post.pattern}</p>
                        </div>
                      )}
                      {post.observed_failure && (
                        <div className="sm:col-span-2 rounded-lg bg-card/80 border border-border p-3">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">Observed Metric Decline</span>
                          <p className="text-foreground mt-0.5">{post.observed_failure}</p>
                        </div>
                      )}
                      {post.recovery_strategy && (
                        <div className="sm:col-span-2 rounded-lg bg-card/80 border border-border p-3">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase">Recovery Strategy / Intervention</span>
                          <p className="text-foreground mt-0.5">{post.recovery_strategy}</p>
                        </div>
                      )}
                      {post.verified_outcome && (
                        <div className="sm:col-span-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Verified Recovery Outcome</span>
                          <p className="text-foreground font-medium mt-0.5">{post.verified_outcome}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Detailed Content */}
                <div className="prose prose-invert max-w-none text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-line py-2">
                  {post.content}
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3 h-3 text-subtle" aria-hidden="true" />
                      <span>Tags:</span>
                    </span>
                    {post.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/community?tag=${encodeURIComponent(t)}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-surface-feed hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Author & Helpful Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{post.author_name}</span>
                    <span className="text-subtle">•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-subtle" aria-hidden="true" />
                      <span>{post.organization_id}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggleHelpful}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer ${
                        hasVoted
                          ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                          : 'bg-surface-feed hover:bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-primary' : ''}`} aria-hidden="true" />
                      <span>{helpfulCount} Helpful</span>
                    </button>
                  </div>
                </div>
              </article>

              {/* Comment Thread Component */}
              <CommentThread
                post={post}
                comments={comments}
                onCommentAdded={handleCommentAdded}
                onAnswerAccepted={handleAnswerAccepted}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
