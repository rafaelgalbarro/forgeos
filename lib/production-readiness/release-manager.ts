/** Program 6500 — Release tracking */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { PRODUCTION_STORAGE_KEYS } from "./config";
import type { ReleaseRecord } from "./types";

function generateId(): string {
  return `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_RELEASES: ReleaseRecord[] = [
  {
    id: "rel-6500",
    version: "0.1.0-program-6500",
    environment: "preview",
    deployedAt: new Date().toISOString(),
    status: "deployed",
    notes: "Production Readiness layer",
  },
  {
    id: "rel-6000",
    version: "0.1.0-program-6000",
    environment: "preview",
    deployedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    status: "deployed",
    notes: "Commercial Readiness",
  },
];

export function listReleases(): ReleaseRecord[] {
  const stored = readStorage<ReleaseRecord[]>(PRODUCTION_STORAGE_KEYS.releases, []);
  return stored.length > 0 ? stored : DEFAULT_RELEASES;
}

export function registerRelease(input: Omit<ReleaseRecord, "id">): ReleaseRecord {
  const release: ReleaseRecord = { id: generateId(), ...input };
  const all = listReleases();
  if (all === DEFAULT_RELEASES) {
    writeStorage(PRODUCTION_STORAGE_KEYS.releases, [release, ...DEFAULT_RELEASES]);
  } else {
    all.unshift(release);
    writeStorage(PRODUCTION_STORAGE_KEYS.releases, all);
  }
  return release;
}

export function getLatestRelease(): ReleaseRecord | null {
  const releases = listReleases();
  return releases[0] ?? null;
}
