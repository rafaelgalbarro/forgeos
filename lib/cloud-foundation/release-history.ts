/** Program 4300 — Release history (localStorage + static seed) */

import { CLOUD_STORAGE_KEYS } from "./config";
import type { ReleaseHistoryEntry } from "./types";

const SEED_RELEASES: ReleaseHistoryEntry[] = [
  {
    id: "rel-4300-seed-1",
    version: "v0.1.0-preview",
    environment: "preview",
    branch: "feature/cloud-foundation",
    deployedAt: "2026-07-10T14:30:00.000Z",
    deployedBy: "cto",
    status: "deployed",
    notes: "Cloud Foundation — preparación preview",
    commitSha: "a1b2c3d",
  },
  {
    id: "rel-4300-seed-2",
    version: "v0.0.9-staging",
    environment: "staging",
    branch: "release/0.0.9",
    deployedAt: "2026-07-05T10:00:00.000Z",
    deployedBy: "release-manager",
    status: "deployed",
    notes: "Staging RC — gates aprobados",
    commitSha: "e4f5g6h",
  },
  {
    id: "rel-4300-seed-3",
    version: "v0.0.8",
    environment: "production",
    branch: "main",
    deployedAt: "2026-06-28T18:00:00.000Z",
    deployedBy: "cto",
    status: "rolled_back",
    notes: "Rollback tras incidente — dry-run activo",
    commitSha: "i7j8k9l",
  },
];

function readFromStorage(): ReleaseHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLOUD_STORAGE_KEYS.releaseHistory);
    if (!raw) return [];
    return JSON.parse(raw) as ReleaseHistoryEntry[];
  } catch {
    return [];
  }
}

function writeToStorage(entries: ReleaseHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLOUD_STORAGE_KEYS.releaseHistory, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

export function getReleaseHistory(): ReleaseHistoryEntry[] {
  const stored = readFromStorage();
  if (stored.length > 0) return stored;
  return SEED_RELEASES;
}

export function registerRelease(entry: Omit<ReleaseHistoryEntry, "id">): ReleaseHistoryEntry {
  const newEntry: ReleaseHistoryEntry = {
    ...entry,
    id: `rel-${Date.now()}`,
  };
  const history = readFromStorage().length > 0 ? readFromStorage() : [...SEED_RELEASES];
  history.unshift(newEntry);
  writeToStorage(history.slice(0, 50));
  return newEntry;
}

export function getLatestRelease(environment?: string): ReleaseHistoryEntry | undefined {
  const history = getReleaseHistory();
  if (environment) {
    return history.find((r) => r.environment === environment);
  }
  return history[0];
}

export function seedReleaseHistory(): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(CLOUD_STORAGE_KEYS.releaseHistory)) {
    writeToStorage(SEED_RELEASES);
  }
}
