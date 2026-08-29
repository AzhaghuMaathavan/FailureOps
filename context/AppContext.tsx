'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Signal, Experiment, OrganizationalMemoryEntry, EvidenceSourceType } from '@/types';

interface AppContextType {

  project: Project;
  setProject: (project: Project) => void;
  uploadedFiles: Record<EvidenceSourceType, string[]>;
  addUploadedFile: (category: EvidenceSourceType, filename: string) => void;
  analysisCompleted: boolean;
  setAnalysisCompleted: (completed: boolean) => void;
  signals: Signal[];
  experiment: Experiment;
  setExperiment: (exp: Experiment) => void;
  memoryEntries: OrganizationalMemoryEntry[];
  addMemoryEntry: (entry: OrganizationalMemoryEntry) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    health: 'AT_RISK',
    failureRisk: 82,
    riskTrend: '+24% over 4 weeks',
    predictedNextFailure: 'Missed Beta Release',
    predictionConfidence: 86,
    historicalSimilarity: 89,
    privacyLevel: 'PRIVATE',
    sourcesUploaded: ['PRODUCT_PLAN', 'CUSTOMER_FEEDBACK', 'PRODUCT_METRICS', 'ENGINEERING_METRICS', 'TEAM_OPERATIONS'],
    lastAnalyzedAt: 'Recently',
    activeFailureSeedsCount: 4,
  });

  const [uploadedFiles, setUploadedFiles] = useState<Record<EvidenceSourceType, string[]>>({
    PRODUCT_PLAN: ['Product Plan.txt'],
    CUSTOMER_FEEDBACK: ['Customer Survey.csv'],
    PRODUCT_METRICS: ['Analytics Report.txt'],
    ENGINEERING_METRICS: ['Incident Report.txt'],
    TEAM_OPERATIONS: ['Meeting Notes.txt'],
    INCIDENT_REPORTS: ['Incident Report.txt'],
  });

  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(true);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [experiment, setExperiment] = useState<Experiment>({
    id: 'exp_ci_stabilize',
    projectId: 'aurora',
    interventionId: 'int_ci',
    hypothesis: 'Pre-flight merge queue validation will reduce CI build failures from 34% to <15% within 14 days.',
    controlGroup: 'Current manual review without merge queue pre-flight gating',
    treatmentGroup: 'Automated merge queue validation with quarantined flaky tests',
    duration: '14 Days',
    successMetric: 'CI build failure rate < 15%',
    status: 'RUNNING',
    baselineMetric: 34,
    currentMetric: 12,
    treatmentMetric: 12,
    improvementDelta: -22,
    evidenceStrength: 91,
    observedOutcome: 'CI build failure rate reduced from 34% to 12% across 14-day observation.',
    aiInterpretation: 'Statistically significant improvement directly attributed to merge queue gating and flaky test quarantine.',
  });


  const [memoryEntries, setMemoryEntries] = useState<OrganizationalMemoryEntry[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load persisted project or preferences on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
    const savedProjectId = localStorage.getItem('failureops_active_project_id');
    if (savedProjectId && savedProjectId !== project.id) {
      import('@/lib/api/client').then(({ apiClient }) => {
        apiClient.getProject(savedProjectId).then(p => {
          if (p && p.id) setProjectState(p);
        }).catch(() => {});
      });
    }
  }, []);

  const setProject = (newProject: Project) => {
    setProjectState(newProject);
    if (typeof window !== 'undefined') {
      localStorage.setItem('failureops_active_project_id', newProject.id);
    }
  };

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
