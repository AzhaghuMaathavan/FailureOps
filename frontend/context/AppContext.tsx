'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Signal, Experiment, OrganizationalMemoryEntry, EvidenceSourceType } from '@/types';

export interface UserProfileState {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  title: string;
  bio: string;
  role: 'ORGANIZATION_ADMIN' | 'INTELLIGENCE_ANALYST' | 'VIEWER';
  isVerified: boolean;
  twoFactorEnabled: boolean;
  avatarUrl?: string;
  notifications?: {
    emailAlerts: boolean;
    sev1Immediate: boolean;
    weeklyDigest: boolean;
    learningShareApproved: boolean;
  };
  recentActivity?: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
  }>;
}

interface AppContextType {
  project: Project;
  setProject: (project: Project) => void;
  user: UserProfileState | null;
  setUser: (user: UserProfileState | null) => void;
  isAuthLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  uploadedFiles: Record<EvidenceSourceType, string[]>;
  addUploadedFile: (category: EvidenceSourceType, filename: string) => void;
  analysisCompleted: boolean;
  setAnalysisCompleted: (completed: boolean) => void;
  signals: Signal[];
  experiment: Experiment | null;
  setExperiment: (exp: Experiment | null) => void;
  memoryEntries: OrganizationalMemoryEntry[];
  addMemoryEntry: (entry: OrganizationalMemoryEntry) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileState | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [project, setProjectState] = useState<Project>({
    id: 'aurora',
    name: 'ExpenseTracker',
    codeName: 'PROJECT AURORA',
    company: 'Aurora Technologies',
    description: 'Expense management & corporate card intelligence platform for fast-scaling SMBs.',
    industry: 'FinTech',
    stage: 'Beta',
    targetUsers: 'SMB Finance Managers & Operations Leads',
    expectedLaunchDate: '2026-10-15',
    health: 'HEALTHY',
    failureRisk: 0,
    riskTrend: 'Baseline',
    predictedNextFailure: 'Awaiting Analysis',
    predictionConfidence: 0,
    historicalSimilarity: 0,
    privacyLevel: 'PRIVATE',
    sourcesUploaded: [],
    lastAnalyzedAt: 'Never',
    activeFailureSeedsCount: 0,
  });

  const [uploadedFiles, setUploadedFiles] = useState<Record<EvidenceSourceType, string[]>>({} as any);
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [memoryEntries, setMemoryEntries] = useState<OrganizationalMemoryEntry[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const refreshUser = useCallback(async () => {
    try {
      const { apiClient } = await import('@/lib/api/client');
      const res = await apiClient.getProfile();
      if (res && res.profile) {
        setUser(res.profile);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.logout();
    } catch {}
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  // Load persisted user & project on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
    refreshUser();

    const savedProjectId = localStorage.getItem('failureops_active_project_id');
    if (savedProjectId && savedProjectId !== project.id) {
      import('@/lib/api/client').then(({ apiClient }) => {
        apiClient.getProject(savedProjectId).then(p => {
          if (p && p.id) setProjectState(p);
        }).catch(() => {});
      });
    }
  }, [refreshUser]);

  const setProject = useCallback((newProject: Project) => {
    setProjectState(newProject);
    if (typeof window !== 'undefined') {
      localStorage.setItem('failureops_active_project_id', newProject.id);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const addUploadedFile = (category: EvidenceSourceType, filename: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), filename],
    }));
  };

  const addMemoryEntry = (entry: OrganizationalMemoryEntry) => {
    setMemoryEntries(prev => [entry, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        project,
        setProject,
        user,
        setUser,
        isAuthLoading,
        refreshUser,
        logout,
        uploadedFiles,
        addUploadedFile,
        analysisCompleted,
        setAnalysisCompleted,
        signals,
        experiment,
        setExperiment,
        memoryEntries,
        addMemoryEntry,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
