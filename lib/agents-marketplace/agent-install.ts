/** PROGRAM 4700 — Agent install flow (localStorage registry only, no AI execution). */

import type { InstallRecord, InstallState, InstallStore } from "./types";

const STORAGE_KEY = "forgeos:agents-marketplace:installed";

const EMPTY_STORE: InstallStore = { records: [], updatedAt: new Date(0).toISOString() };

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readInstallStore(): InstallStore {
  if (!isBrowser()) return EMPTY_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as InstallStore;
    if (!Array.isArray(parsed.records)) return EMPTY_STORE;
    return parsed;
  } catch {
    return EMPTY_STORE;
  }
}

export function writeInstallStore(store: InstallStore): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store, updatedAt: new Date().toISOString() }));
}

export function getInstallState(agentId: string): InstallState {
  const store = readInstallStore();
  return store.records.some((r) => r.agentId === agentId) ? "installed" : "not-installed";
}

export function isAgentInstalled(agentId: string): boolean {
  return getInstallState(agentId) === "installed";
}

export function getInstallRecord(agentId: string): InstallRecord | undefined {
  return readInstallStore().records.find((r) => r.agentId === agentId);
}

export function installAgent(agentId: string, version: string): InstallRecord {
  const store = readInstallStore();
  const existing = store.records.findIndex((r) => r.agentId === agentId);
  const record: InstallRecord = { agentId, installedAt: new Date().toISOString(), version };
  if (existing >= 0) {
    store.records[existing] = record;
  } else {
    store.records.push(record);
  }
  writeInstallStore(store);
  return record;
}

export function uninstallAgent(agentId: string): void {
  const store = readInstallStore();
  store.records = store.records.filter((r) => r.agentId !== agentId);
  writeInstallStore(store);
}

export function listInstalledAgents(): InstallRecord[] {
  return readInstallStore().records;
}

export function getInstalledCount(): number {
  return readInstallStore().records.length;
}

/** Server-safe fixture for SSR (no localStorage). */
export function getServerInstallState(agentId: string): InstallState {
  return "not-installed";
}
