'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Signal, Experiment, OrganizationalMemoryEntry, EvidenceSourceType } from '@/types';
import { mockProjects } from '@/data/mockProjects';
import { mockSignals } from '@/data/mockSignals';
import { mockExperiments } from '@/data/mockExperiments';
import { mockMemoryEntries } from '@/data/mockMemory';

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
  const [project, setProject] = useState<Project>(mockProjects[0]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<EvidenceSourceType, string[]>>({
    PRODUCT_PLAN: ['product_plan.pdf'],
    CUSTOMER_FEEDBACK: ['customer_feedback.csv'],
    PRODUCT_METRICS: ['product_metrics.csv'],
    ENGINEERING_METRICS: ['engineering_metrics.csv'],
    TEAM_OPERATIONS: ['team_operations.csv'],
    INCIDENT_REPORTS: ['incidents_postmortems.pdf'],
  });
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(true);
  const [signals] = useState<Signal[]>(mockSignals);
  const [experiment, setExperiment] = useState<Experiment>(mockExperiments[0]);
  const [memoryEntries, setMemoryEntries] = useState<OrganizationalMemoryEntry[]>(mockMemoryEntries);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Ensure dark class on html root by default
    document.documentElement.classList.add('dark');
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
