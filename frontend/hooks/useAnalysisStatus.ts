'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { AnalysisStage } from '@/types';
import { RAG_ANALYSIS_STAGES } from '@/services/analysisService';

export interface UseAnalysisStatusOptions {
  projectId: string;
  analysisId?: string | null;
  autoStart?: boolean;
  baseIntervalMs?: number;
  maxIntervalMs?: number;
}

export function useAnalysisStatus({
  projectId,
  analysisId: initialAnalysisId = null,
  autoStart = false,
  baseIntervalMs = 2500,
  maxIntervalMs = 10000,
}: UseAnalysisStatusOptions) {
  const [analysisId, setAnalysisId] = useState<string | null>(initialAnalysisId);
  const [status, setStatus] = useState<string>('QUEUED');
  const [currentStage, setCurrentStage] = useState<string>('NOT_STARTED');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [stages, setStages] = useState<AnalysisStage[]>(RAG_ANALYSIS_STAGES);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<number>(baseIntervalMs);
  const isCancelledRef = useRef<boolean>(false);
  const lastLogKeyRef = useRef<string>('');

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollStatus = useCallback(async (activeId: string) => {
    if (isCancelledRef.current) return;

    try {
      const data = await apiClient.getAnalysisStatus(activeId, projectId);
      
      setStatus(data.status);
      setCurrentStage(data.currentStage || 'IN_PROGRESS');
      if (typeof data.progressPercent === 'number') {
        setProgressPercent(data.progressPercent);
      }
      if (data.stages?.length) {
        setStages(data.stages);
      }

      const logKey = `${data.status}:${data.currentStage}:${data.progressPercent}`;
      if (logKey !== lastLogKeyRef.current) {
        lastLogKeyRef.current = logKey;
        setLogs((prev) => [
          ...prev,
          `[${new Date().toISOString().slice(11, 19)}] ${data.status} (${data.progressPercent || 0}%) ${data.currentStage || ''}`.trim(),
        ]);
      }

      if (data.status === 'COMPLETED') {
        setIsFinished(true);
        setMetrics(data.resultSummary || null);
        setStages((prev) => prev.map((s) => ({ ...s, status: 'COMPLETED' })));
        setLogs((prev) => [
          ...prev,
          `[${new Date().toISOString().slice(11, 19)}] Analysis COMPLETED successfully.`,
        ]);
        stopPolling();
        return;
      }

      if (data.status === 'FAILED') {
        setError(data.errorMessage || 'Analysis execution failed.');
        stopPolling();
        return;
      }

      // If backend is retrying / throttled, back off polling interval
      if (data.status === 'RETRYING') {
        intervalRef.current = Math.min(intervalRef.current * 1.5, maxIntervalMs);
      } else {
        intervalRef.current = baseIntervalMs;
      }

      // Schedule next poll iteration
      if (!isCancelledRef.current) {
        timeoutRef.current = setTimeout(() => pollStatus(activeId), intervalRef.current);
      }
    } catch (err: any) {
      if (isCancelledRef.current) return;
      const is429 = err?.status === 429 || /Rate limit/i.test(err?.message || '');
      if (is429) {
        // Slow down polling significantly on rate limit
        intervalRef.current = Math.min(intervalRef.current * 2, maxIntervalMs);
        timeoutRef.current = setTimeout(() => pollStatus(activeId), intervalRef.current);
      } else {
        setError(isRagUnavailable(err) ? 'RAG unavailable' : err.message || 'Polling failed.');
        stopPolling();
      }
    }
  }, [projectId, baseIntervalMs, maxIntervalMs, stopPolling]);

  const startAnalysis = useCallback(async () => {
    setError(null);
    setIsFinished(false);
    setProgressPercent(0);
    setLogs([`[${new Date().toISOString().slice(11, 19)}] Initiating analysis for project ${projectId}...`]);
    setIsPolling(true);

    try {
      const res = await apiClient.startAnalysis(projectId, 'DEEP');
      const anlId = res.analysisId || res.jobId;
      setAnalysisId(anlId);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toISOString().slice(11, 19)}] Analysis job registered: ${anlId}`,
      ]);
      intervalRef.current = baseIntervalMs;
      pollStatus(anlId);
    } catch (err: any) {
      setError(isRagUnavailable(err) ? 'RAG unavailable' : err.message || 'Failed to start analysis.');
      setIsPolling(false);
    }
  }, [projectId, baseIntervalMs, pollStatus]);

  useEffect(() => {
    isCancelledRef.current = false;

    if (autoStart) {
      startAnalysis();
    } else if (initialAnalysisId) {
      setIsPolling(true);
      pollStatus(initialAnalysisId);
    }

    return () => {
      isCancelledRef.current = true;
      stopPolling();
    };
  }, [autoStart, initialAnalysisId, startAnalysis, pollStatus, stopPolling]);

  return {
    analysisId,
    status,
    currentStage,
    progressPercent,
    stages,
    isFinished,
    isPolling,
    error,
    metrics,
    logs,
    startAnalysis,
    stopPolling,
  };
}
