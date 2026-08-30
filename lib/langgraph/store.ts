import 'server-only';
import type { LangGraphRunSnapshot, StagedUploadFile } from './types';

const runs = new Map<string, LangGraphRunSnapshot>();
const filesByRun = new Map<string, StagedUploadFile[]>();
const latestByProject = new Map<string, string>();

export function createRunId(): string {
  return `lg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function putRun(snapshot: LangGraphRunSnapshot, files?: StagedUploadFile[]): LangGraphRunSnapshot {
  runs.set(snapshot.runId, snapshot);
  latestByProject.set(snapshot.projectId, snapshot.runId);
  if (files) filesByRun.set(snapshot.runId, files);
  return snapshot;
}

export function patchRun(
  runId: string,
  patch: Partial<LangGraphRunSnapshot>
): LangGraphRunSnapshot | null {
  const current = runs.get(runId);
  if (!current) return null;
  const next: LangGraphRunSnapshot = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  runs.set(runId, next);
  return next;
}

export function getRun(runId: string): LangGraphRunSnapshot | null {
  return runs.get(runId) ?? null;
}

export function getLatestRun(projectId: string): LangGraphRunSnapshot | null {
  const id = latestByProject.get(projectId);
  return id ? getRun(id) : null;
}

export function getRunFiles(runId: string): StagedUploadFile[] {
  return filesByRun.get(runId) ?? [];
}

export function clearRunFiles(runId: string): void {
  filesByRun.delete(runId);
}
