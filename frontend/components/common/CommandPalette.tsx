'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Activity,
  Dna,
  Scale,
  Radar,
  GitFork,
  Compass,
  Sparkles,
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  FileText,
  MessageSquare,
  Database,
  Shield,
  ArrowRight,
  X,
  Server,
  Brain,
  HeartPulse,
  Landmark,
  Terminal,
  Building2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';
import { Project } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

function getIndustryIcon(industry?: string) {
  const ind = (industry || '').toLowerCase();
  if (ind.includes('ai') || ind.includes('ml')) return Brain;
  if (ind.includes('health')) return HeartPulse;
  if (ind.includes('fintech') || ind.includes('finance')) return Landmark;
  if (ind.includes('dev') || ind.includes('tool')) return Terminal;
  return Server;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { project, setProject } = useApp();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      apiClient.getProjects().then((data) => {
        if (data) setProjects(data);
      }).catch(() => {});
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const modules = useMemo(() => {
    const pId = project.id || 'aurora';
    return [
      { name: 'Project Overview', section: 'Active Project', href: `/projects/${pId}/overview`, icon: LayoutDashboard, desc: 'Executive intelligence & health summary' },
      { name: 'Signal Explorer', section: 'Active Project', href: `/projects/${pId}/signals`, icon: Activity, desc: 'Weak signals & telemetry time-series' },
      { name: 'Failure DNA Radar', section: 'Active Project', href: `/projects/${pId}/radar`, icon: Radar, desc: 'Dimensional risk profile & thresholds' },
      { name: 'Failure DNA Analysis', section: 'Active Project', href: `/projects/${pId}/dna`, icon: Dna, desc: 'Cross-entropy archetype breakdown' },
      { name: 'Truth Engine', section: 'Active Project', href: `/projects/${pId}/truth-engine`, icon: Scale, desc: 'Contradiction & claim verification' },
      { name: 'Predicted Failure Mode', section: 'Active Project', href: `/projects/${pId}/prediction`, icon: Compass, desc: 'Early seed warning & failure trajectory' },
      { name: 'What-If Simulation', section: 'Active Project', href: `/projects/${pId}/simulation`, icon: Sparkles, desc: 'Counterfactual stress testing & modeling' },
      { name: 'Interventions & Fixes', section: 'Active Project', href: `/projects/${pId}/interventions`, icon: Lightbulb, desc: 'Validated anti-failure actions' },
      { name: 'Evidence Intelligence', section: 'Active Project', href: `/projects/${pId}/evidence`, icon: FileText, desc: 'Source documents, parsed claims & chunks' },
      { name: 'Evidence Ask Q&A', section: 'Active Project', href: `/projects/${pId}/ask`, icon: MessageSquare, desc: 'Grounded query agent with lineage' },
      { name: 'RAG Pipeline Health', section: 'Active Project', href: `/projects/${pId}/pipeline`, icon: Database, desc: 'Parser, chunking, and embedding health' },
      { name: 'Global Dashboard', section: 'Navigation', href: '/dashboard', icon: Building2, desc: 'Cross-project organizational fleet' },
      { name: 'Validated Learnings', section: 'Navigation', href: '/memory', icon: Shield, desc: 'Organizational memory & twin cases' },
    ];
  }, [project.id]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return [
        ...projects.slice(0, 4).map((p) => ({
          type: 'project' as const,
          id: p.id,
          title: p.name || p.codeName,
          subtitle: `${p.industry || 'Tech'} · ${p.failureRisk}% risk · ${p.stage || 'Dev'}`,
          icon: getIndustryIcon(p.industry),
          action: () => {
            setProject(p);
            router.push(`/projects/${p.id}/overview`);
            onClose();
          },
        })),
        ...modules.map((m) => ({
          type: 'module' as const,
          id: m.href,
          title: m.name,
          subtitle: `${m.section} · ${m.desc}`,
          icon: m.icon,
          action: () => {
            router.push(m.href);
            onClose();
          },
        })),
      ];
    }

    const matchedProjects = projects
      .filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.codeName && p.codeName.toLowerCase().includes(q)) ||
        (p.industry && p.industry.toLowerCase().includes(q)) ||
        (p.predictedNextFailure && p.predictedNextFailure.toLowerCase().includes(q))
      )
      .map((p) => ({
        type: 'project' as const,
        id: p.id,
        title: p.name || p.codeName,
        subtitle: `Project · ${p.industry || 'Tech'} · ${p.failureRisk}% risk`,
        icon: getIndustryIcon(p.industry),
        action: () => {
          setProject(p);
          router.push(`/projects/${p.id}/overview`);
          onClose();
        },
      }));

    const matchedModules = modules
      .filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q) ||
        m.section.toLowerCase().includes(q)
      )
      .map((m) => ({
        type: 'module' as const,
        id: m.href,
        title: m.name,
        subtitle: `${m.section} · ${m.desc}`,
        icon: m.icon,
        action: () => {
          router.push(m.href);
          onClose();
        },
      }));

    return [...matchedProjects, ...matchedModules];
  }, [query, projects, modules, router, setProject, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Access Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-surface-feed/50 gap-3">
          <Search className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, modules, signals, DNA..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm font-medium focus:outline-none"
            aria-label="Quick search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded bg-surface-feed border border-border text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1 max-h-96">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              No matching projects or intelligence modules found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : 'hover:bg-surface-feed text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-surface-feed text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{item.subtitle}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.type === 'project' && (
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">
                        Project
                      </span>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 border-t border-border bg-surface-feed/70 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-card border border-border text-[9px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 rounded bg-card border border-border text-[9px]">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[9px]">↵</kbd> Select
            </span>
          </div>
          <span>FailureOps X Intelligence Network</span>
        </div>
      </div>
    </div>
  );
};
