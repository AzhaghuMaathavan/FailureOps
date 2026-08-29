'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params?.id as string | undefined;
  const { project, setProject } = useApp();

  useEffect(() => {
    if (!projectId || projectId === project.id) return;
    let cancelled = false;
    apiClient
      .getProject(projectId)
      .then((p) => {
        if (!cancelled && p?.id) setProject(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId, project.id, setProject]);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
