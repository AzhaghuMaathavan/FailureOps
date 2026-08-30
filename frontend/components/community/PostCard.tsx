'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  Tag,
  Dna,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { CommunityPost } from '@/types';
import { PostTypeBadge } from './PostTypeBadge';
import { CommunityPrivacyBadge } from './CommunityPrivacyBadge';
import { apiClient } from '@/lib/api/client';

interface PostCardProps {
  post: CommunityPost;
  onVoteChange?: (postId: string, newCount: number, voted: boolean) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onVoteChange }) => {
  const [helpfulCount, setHelpfulCount] = useState(post.helpful_count || 0);
  const [hasVoted, setHasVoted] = useState(post.has_voted_helpful || false);
  const [isVoting, setIsVoting] = useState(false);

  const handleToggleHelpful = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isVoting) return;

    setIsVoting(true);
    // Optimistic update
    const nextVoted = !hasVoted;
    const nextCount = nextVoted ? helpfulCount + 1 : Math.max(0, helpfulCount - 1);
    setHasVoted(nextVoted);
    setHelpfulCount(nextCount);

    try {
      const res = await apiClient.toggleCommunityHelpful(post.id);
      setHasVoted(res.voted);
      if (onVoteChange) {
        onVoteChange(post.id, nextCount, res.voted);
      }
    } catch (err) {
      // Revert on error
      setHasVoted(!nextVoted);
      setHelpfulCount(helpfulCount);
    } finally {
      setIsVoting(false);
    }
  };

  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <article className="group relative rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-subtle transition-all duration-200">
      {/* Header Badges & Metas */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <PostTypeBadge type={post.post_type} />
          <CommunityPrivacyBadge visibility={post.visibility} />
          {post.accepted_comment_id && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              <span>Resolved Outcome</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 text-subtle" aria-hidden="true" />
          <time dateTime={post.created_at}>{formattedDate}</time>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors duration-150 mb-2">
        <Link href={`/community/${post.id}`} className="focus-visible:outline-none focus-visible:underline">
          {post.title}
        </Link>
      </h3>

      {/* Summary */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
        {post.summary}
      </p>

      {/* Verified Outcome / Failure highlight */}
      {post.verified_outcome && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Verified Recovery Outcome</span>
          </div>
          <p className="text-muted-foreground line-clamp-2">{post.verified_outcome}</p>
        </div>
      )}

      {/* FailureOps Domain Chips */}
      {(post.failure_dimension || post.pattern) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.failure_dimension && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-surface-feed border border-border text-muted-foreground">
              <Dna className="w-3 h-3 text-primary" aria-hidden="true" />
              <span>Dimension: {post.failure_dimension}</span>
            </span>
          )}
          {post.pattern && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-surface-feed border border-border text-muted-foreground">
              <span>Pattern: {post.pattern}</span>
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`/community?tag=${encodeURIComponent(t)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-surface-feed hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors duration-150"
            >
              <Tag className="w-2.5 h-2.5 opacity-60" aria-hidden="true" />
              <span>{t}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Footer Details & Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="font-medium text-foreground">{post.author_name}</span>
          <span className="text-subtle">•</span>
          <span className="flex items-center gap-1 text-[11px]">
            <Building2 className="w-3 h-3 text-subtle" aria-hidden="true" />
            <span>{post.organization_id}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Helpful button */}
          <button
            type="button"
            onClick={handleToggleHelpful}
            aria-label="Mark experience as helpful"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer ${
              hasVoted
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-surface-feed hover:bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-primary' : ''}`} aria-hidden="true" />
            <span>{helpfulCount}</span>
            <span className="hidden sm:inline">Helpful</span>
          </button>

          {/* Comments count */}
          <Link
            href={`/community/${post.id}#discussion`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors duration-150"
          >
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{post.comment_count || 0}</span>
            <span className="hidden sm:inline">Comments</span>
          </Link>
        </div>
      </div>
    </article>
  );
};
