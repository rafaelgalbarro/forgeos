/** PROGRAM 5380 — Deployment persistence. */

import type { DeploymentHistoryEntry, PreviewDeploymentRequest } from "./types";

const REQUESTS_KEY = "forgeos-preview-deployments";
const HISTORY_KEY = "forgeos-preview-deployment-history";

const memoryRequests = new Map<string, PreviewDeploymentRequest>();
const memoryHistory: DeploymentHistoryEntry[] = [];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function loadRequests(): PreviewDeploymentRequest[] {
  if (isBrowser()) {
    try {
      const raw = localStorage.getItem(REQUESTS_KEY);
      if (raw) return JSON.parse(raw) as PreviewDeploymentRequest[];
    } catch {
      /* ignore */
    }
  }
  return Array.from(memoryRequests.values());
}

function persistRequests(requests: PreviewDeploymentRequest[]): void {
  for (const r of requests) memoryRequests.set(r.deploymentId, r);
  if (isBrowser()) {
    try {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    } catch {
      /* ignore */
    }
  }
}

function loadHistory(): DeploymentHistoryEntry[] {
  if (isBrowser()) {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) return JSON.parse(raw) as DeploymentHistoryEntry[];
    } catch {
      /* ignore */
    }
  }
  return [...memoryHistory];
}

function persistHistory(entries: DeploymentHistoryEntry[]): void {
  memoryHistory.length = 0;
  memoryHistory.push(...entries);
  if (isBrowser()) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch {
      /* ignore */
    }
  }
}

export function saveDeploymentRequest(request: PreviewDeploymentRequest): void {
  const all = loadRequests().filter((r) => r.deploymentId !== request.deploymentId);
  all.push(request);
  persistRequests(all);
}

export function getDeploymentRequest(deploymentId: string): PreviewDeploymentRequest | undefined {
  return loadRequests().find((r) => r.deploymentId === deploymentId);
}

export function getDeploymentsForMission(missionId: string): PreviewDeploymentRequest[] {
  return loadRequests()
    .filter((r) => r.missionId === missionId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listAllDeployments(): PreviewDeploymentRequest[] {
  return loadRequests().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function addDeploymentHistoryEntry(entry: DeploymentHistoryEntry): void {
  const all = loadHistory().filter((e) => e.deploymentId !== entry.deploymentId);
  all.unshift(entry);
  persistHistory(all.slice(0, 100));
}

export function getDeploymentHistory(missionId?: string): DeploymentHistoryEntry[] {
  const all = loadHistory();
  if (!missionId) return all;
  return all.filter((e) => e.missionId === missionId);
}

export function getActivePreviewDeployments(missionId: string): DeploymentHistoryEntry[] {
  return getDeploymentHistory(missionId).filter(
    (e) => (e.status === "READY" || e.status === "READY_WITH_PLAN") && !e.rolledBack
  );
}
