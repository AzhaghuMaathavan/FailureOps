'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Activity,
  Dna,
  Scale,
  Radar,
  GitFork,
  Compass,
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  Database,
  Search,
  Settings,
  UploadCloud,
  PlusCircle,
  Shield,
  Sparkles,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { RiskBadge } from '@/components/common/RiskBadge';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { BrandLogo } from '@/components/common/BrandLogo';
import { isNavItemActive } from '@/lib/navigation';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const { project } = useApp();
  const projectId = project.id;

  const navigation: { group: string; items: { name: string; href: string; icon: LucideIcon; badge?: string }[] }[] = [
    {
      group: 'PROJECT INTELLIGENCE',
      items: [
        { name: 'Overview', href: `/projects/${projectId}/overview`, icon: LayoutDashboard },
        { name: 'Evidence Intelligence', href: `/projects/${projectId}/evidence`, icon: FileText },
        { name: 'Evidence Ask', href: `/projects/${projectId}/ask`, icon: MessageSquare },
        { name: 'RAG Pipeline Health', href: `/projects/${projectId}/pipeline`, icon: Database },
        { name: 'Signal Explorer', href: `/projects/${projectId}/signals`, icon: Activity },
        { name: 'Failure DNA', href: `/projects/${projectId}/dna`, icon: Dna },
        { name: 'Truth Engine', href: `/projects/${projectId}/truth-engine`, icon: Scale },
        { name: 'Failure Radar', href: `/projects/${projectId}/radar`, icon: Radar },
        { name: 'Causal Analysis', href: `/projects/${projectId}/causal`, icon: GitFork },
        { name: 'Predicted Failure', href: `/projects/${projectId}/prediction`, icon: Compass },
        { name: 'What-If Simulation', href: `/projects/${projectId}/simulation`, icon: Sparkles },
        { name: 'Interventions', href: `/projects/${projectId}/interventions`, icon: Lightbulb },
        { name: 'Experiments', href: `/projects/${projectId}/experiment`, icon: FlaskConical },
        { name: 'Outcome Verification', href: `/projects/${projectId}/outcomes`, icon: CheckCircle2 },
      ],
    },
    {
      group: 'ORGANIZATIONAL MEMORY',
      items: [
        { name: 'Global Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Historical Cases', href: '/historical/atlas', icon: Database },
        { name: 'Validated Learnings', href: '/memory', icon: Shield },
        { name: 'Global Search', href: '/search', icon: Search },
        { name: 'Settings & Privacy', href: '/settings', icon: Settings },
      ],
    },
  ];

  const chromeLink =
    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar';

  return (
    <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0 z-40 select-none">
      <div className="shrink-0 px-4 pt-4 pb-4">
        <BrandLogo size="md" href="/" glow={false} />
      </div>

      <div className="shrink-0 px-3 pb-3 space-y-1.5">
        <Link
          href={`/projects/${projectId}/upload`}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-feed hover:bg-card border border-border text-[11px] font-semibold text-foreground transition-colors duration-150 ${chromeLink}`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span>Upload Evidence</span>
        </Link>
        <Link
          href="/register"
          className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-feed text-[11px] font-medium transition-colors duration-150 ${chromeLink}`}
        >
          <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Register New Product</span>
        </Link>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 py-1 space-y-4" aria-label="Primary">
        {navigation.map(section => (
          <div key={section.group} className="space-y-0.5">
            <h5 className="px-2.5 pb-1 text-[9px] font-bold tracking-[0.08em] text-subtle uppercase">
              {section.group}
            </h5>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = isNavItemActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center justify-between px-2.5 py-[7px] rounded-lg text-[11px] font-medium transition-colors duration-150 border ${chromeLink} ${
                      isActive
                        ? 'bg-primary-muted text-primary font-semibold border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-feed border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface-feed text-muted-foreground border border-border'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 m-3 p-3 rounded-xl bg-card border border-border shadow-card">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider truncate">
            {project.name}
          </span>
          <RiskBadge level={project.health} />
        </div>
        <p className="mt-1.5 text-xs font-mono font-bold text-destructive truncate">
          {project.failureRisk}% risk  ·  {project.predictedNextFailure}
        </p>
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-2">
          <PrivacyBadge level={project.privacyLevel} />
          <Link
            href={`/projects/${projectId}/radar`}
            className={`text-[10px] font-semibold text-primary hover:text-primary-hover whitespace-nowrap ${chromeLink} rounded-md`}
          >
            Radar →
          </Link>
        </div>
      </div>
    </aside>
  );
};
