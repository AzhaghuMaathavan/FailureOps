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
  AlertOctagon,
  Shield,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { RiskBadge } from '@/components/common/RiskBadge';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const { project } = useApp();
  const projectId = project.id;

  const navigation: { group: string; items: { name: string; href: string; icon: any; badge?: string }[] }[] = [
    {
      group: 'PROJECT INTELLIGENCE',
      items: [
        { name: 'Overview', href: `/projects/${projectId}/overview`, icon: LayoutDashboard },
        { name: 'Evidence Intelligence', href: `/projects/${projectId}/evidence`, icon: FileText },
        { name: 'Signal Explorer', href: `/projects/${projectId}/signals`, icon: Activity },
        { name: 'Failure DNA', href: `/projects/${projectId}/dna`, icon: Dna },
        { name: 'Truth Engine', href: `/projects/${projectId}/truth-engine`, icon: Scale },
        { name: 'Failure Radar', href: `/projects/${projectId}/radar`, icon: Radar },
        { name: 'Causal Analysis', href: `/projects/${projectId}/causal`, icon: GitFork },
        { name: 'Predicted Failure', href: `/projects/${projectId}/prediction`, icon: Compass },
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



  return (
    <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col justify-between h-screen sticky top-0 overflow-y-auto no-scrollbar z-40 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-amber-500 to-rose-600 flex items-center justify-center shadow-[0_0_15px_rgba(255,122,0,0.4)] transition-transform group-hover:scale-105">
              <span className="font-mono text-white font-extrabold text-sm tracking-wider">FX</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-foreground text-sm font-mono">
                  FAILUREOPS
                </span>
                <span className="text-primary font-mono text-xs font-black">X</span>
              </div>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                Early-Warning Intel
              </span>
            </div>
          </Link>
        </div>

        {/* Action Button: Register or Upload */}
        <div className="p-3 border-b border-sidebar-border space-y-1.5">
          <Link
            href={`/projects/${projectId}/upload`}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-feed hover:bg-card border border-border/80 text-xs font-semibold text-foreground transition-all hover:border-primary/50 shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-primary" />
            <span>Upload Evidence</span>
          </Link>
          <Link
            href="/register"
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register New Product</span>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-6">
          {navigation.map(section => (
            <div key={section.group} className="space-y-1">
              <h5 className="px-2.5 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                {section.group}
              </h5>
              <div className="space-y-0.5 mt-1">
                {section.items.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary/15 text-primary font-semibold border border-primary/40 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-feed border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-semibold ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'bg-surface-feed text-muted-foreground border border-border/50'
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
      </div>

      {/* Bottom Health Card */}
      <div className="p-3 m-3 rounded-xl bg-card border border-border/80 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Active Trajectory
          </span>
          <RiskBadge level={project.health} />
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xs font-bold text-foreground truncate">{project.name}</span>
          <span className="text-sm font-mono font-extrabold text-rose-400">{project.failureRisk}% Risk</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          Predicted: <span className="text-foreground font-medium">{project.predictedNextFailure}</span>
        </p>
        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
          <PrivacyBadge level={project.privacyLevel} />
          <Link
            href={`/projects/${projectId}/radar`}
            className="text-[10px] font-semibold text-primary hover:underline"
          >
            Radar →
          </Link>
        </div>
      </div>
    </aside>
  );
};
