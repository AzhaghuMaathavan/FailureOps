'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  PlusCircle,
  Filter,
  Sparkles,
  HelpCircle,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Tag,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { PostCard } from '@/components/community/PostCard';
import { apiClient } from '@/lib/api/client';
import { CommunityPost, CommunityTag } from '@/types';

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [tags, setTags] = useState<CommunityTag[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<string>('ALL');
  const [activeSort, setActiveSort] = useState<string>('trending');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getCommunityPosts({
        post_type: activeType === 'ALL' ? undefined : activeType,
        tag: selectedTag || undefined,
        sort: activeSort,
        query: searchQuery.trim() || undefined,
        limit: 50,
      });
      setPosts(res.posts || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch community posts:', err);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeType, activeSort, selectedTag]);

  useEffect(() => {
    apiClient.getCommunityTags().then(setTags).catch(() => setTags([]));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  const postTypeFilters = [
    { id: 'ALL', label: 'All Experiences', icon: Sparkles },
    { id: 'FAILURE_REPORT', label: 'Failure Reports', icon: AlertTriangle },
    { id: 'QUESTION', label: 'Questions', icon: HelpCircle },
    { id: 'LESSON', label: 'Lessons Learned', icon: BookOpen },
    { id: 'RECOVERY', label: 'Recovery Strategies', icon: RefreshCw },
    { id: 'DISCUSSION', label: 'Discussions', icon: MessageSquare },
  ];

  const sortOptions = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'most_discussed', label: 'Most Discussed', icon: MessageSquare },
    { id: 'verified_outcomes', label: 'Verified Outcomes', icon: CheckCircle2 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <TopHeader />

        <main className="flex-1 px-4 py-6 lg:px-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Hero Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Users className="w-4 h-4" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  FailureOps Community
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Learn from real product and project failure intelligence, experiments, and verified recoveries.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/community/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all duration-150 shadow-primary-glow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>Share an experience</span>
              </Link>
            </div>
          </div>

          {/* Search & Sort Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-8 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search failures, products, patterns, recovery strategies, tags..."
                className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-surface-feed hover:bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Sort Dropdown / Selector */}
            <div className="md:col-span-4 flex items-center justify-end gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {sortOptions.map((s) => {
                const Icon = s.icon;
                const isActive = activeSort === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSort(s.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                        : 'bg-card hover:bg-surface-feed border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/50">
            {postTypeFilters.map((t) => {
              const Icon = t.icon;
              const isActive = activeType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveType(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                      : 'bg-card hover:bg-surface-feed border-border text-muted-foreground hover:text-foreground font-medium'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Feed Content Layout (Sidebar with Popular Tags + Main Posts Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Posts Feed Column */}
            <div className="lg:col-span-9 space-y-4">
              {selectedTag && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-feed border border-border text-xs">
                  <span className="text-muted-foreground">
                    Filtering by tag: <strong className="text-primary font-mono">{selectedTag}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTag('')}
                    className="text-xs text-muted-foreground hover:text-destructive underline cursor-pointer"
                  >
                    Clear filter
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 rounded-xl border border-border bg-card/50 animate-pulse" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
                  <AlertTriangle className="mx-auto size-10 text-subtle mb-3" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-foreground">No experiences found</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5 leading-relaxed">
                    No community posts matched your search filters. Be the first to share an empirical failure report, question, or recovery strategy.
                  </p>
                  <Link
                    href="/community/new"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Share an Experience</span>
                  </Link>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onVoteChange={(postId, newCount, voted) => {
                      setPosts((prev) =>
                        prev.map((p) =>
                          p.id === postId
                            ? { ...p, helpful_count: newCount, has_voted_helpful: voted }
                            : p
                        )
                      );
                    }}
                  />
                ))
              )}
            </div>

            {/* Sidebar Column: Tags & Info */}
            <aside className="lg:col-span-3 space-y-6">
              {/* Privacy Notice Box */}
              <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>FailureOps Privacy Guarantees</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Internal confidential evidence documents and company credentials are never exposed. All public knowledge is screened by our zero-leakage scanner.
                </p>
              </div>

              {/* Popular Tags */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Tag className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Popular Failure Patterns</span>
                </div>

                {tags.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No tags recorded yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => {
                      const isSelected = selectedTag.toLowerCase() === t.name.toLowerCase();
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTag(isSelected ? '' : t.name)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground font-bold'
                              : 'bg-surface-feed hover:bg-muted text-muted-foreground hover:text-foreground border border-border'
                          }`}
                        >
                          <span>{t.name}</span>
                          <span className="text-[9px] opacity-70">({t.usage_count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
