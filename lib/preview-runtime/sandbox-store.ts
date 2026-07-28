/** PROGRAM 5370 — In-memory sandbox store. */

import type { PaginatedLogs, PreviewLogEntry, PreviewSandbox, SandboxListFilter, SandboxPreviewBuild } from "./types";

const sandboxes = new Map<string, PreviewSandbox>();
const logBuffers = new Map<string, PreviewLogEntry[]>();
const sandboxBuilds = new Map<string, SandboxPreviewBuild>();

export function generateSandboxId(): string {
  return `sbx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveSandbox(sandbox: PreviewSandbox): void {
  sandboxes.set(sandbox.id, { ...sandbox, updatedAt: new Date().toISOString() });
}

export function getSandbox(id: string): PreviewSandbox | undefined {
  return sandboxes.get(id);
}

export function listSandboxes(filter?: SandboxListFilter): PreviewSandbox[] {
  let result = [...sandboxes.values()];
  if (filter?.missionId) result = result.filter((s) => s.missionId === filter.missionId);
  if (filter?.status) result = result.filter((s) => s.status === filter.status);
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteSandbox(id: string): boolean {
  logBuffers.delete(id);
  return sandboxes.delete(id);
}

export function appendLog(sandboxId: string, entry: Omit<PreviewLogEntry, "id">): PreviewLogEntry {
  const full: PreviewLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...entry,
  };
  const buf = logBuffers.get(sandboxId) ?? [];
  buf.push(full);
  if (buf.length > 5000) buf.splice(0, buf.length - 5000);
  logBuffers.set(sandboxId, buf);

  const sandbox = sandboxes.get(sandboxId);
  if (sandbox) {
    sandbox.logs = buf.slice(-100);
    sandbox.updatedAt = new Date().toISOString();
  }
  return full;
}

export function getLogs(sandboxId: string, offset = 0, limit = 100): PaginatedLogs {
  const buf = logBuffers.get(sandboxId) ?? [];
  const entries = buf.slice(offset, offset + limit);
  return {
    entries,
    total: buf.length,
    offset,
    limit,
    hasMore: offset + limit < buf.length,
  };
}

export function updateSandboxStatus(id: string, status: PreviewSandbox["status"], extra?: Partial<PreviewSandbox>): PreviewSandbox | undefined {
  const sandbox = sandboxes.get(id);
  if (!sandbox) return undefined;
  Object.assign(sandbox, extra, { status, updatedAt: new Date().toISOString() });
  return sandbox;
}

export function saveSandboxBuild(build: SandboxPreviewBuild): void {
  sandboxBuilds.set(build.buildId, build);
}

export function getSandboxBuild(buildId: string): SandboxPreviewBuild | undefined {
  return sandboxBuilds.get(buildId);
}

export function getLatestSandboxBuildForMission(missionId: string): SandboxPreviewBuild | undefined {
  return [...sandboxBuilds.values()]
    .filter((b) => b.missionId === missionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
