/**
 * ForgeOS 2030.1 — operational in-memory release registry.
 */

import { getEpic } from "./epic-registry";
import type { ReleaseRecord, ReleaseSpec } from "./types";

const releases = new Map<string, ReleaseRecord>();

export function registerRelease(release: ReleaseRecord): void {
  const epic = getEpic(release.epicId);
  if (!epic) {
    throw new Error(`Cannot register release: epic not found (${release.epicId})`);
  }
  if (release.programId !== epic.programId) {
    throw new Error(
      `Release programId (${release.programId}) must match epic programId (${epic.programId})`,
    );
  }
  releases.set(release.id, release);
}

export function getRelease(releaseId: string): ReleaseRecord | undefined {
  return releases.get(releaseId);
}

export function listReleases(): ReleaseRecord[] {
  return Array.from(releases.values());
}

export function listReleasesByEpic(epicId: string): ReleaseRecord[] {
  return listReleases().filter((release) => release.epicId === epicId);
}

export function linkFeaturesToRelease(releaseId: string, featureIds: string[]): ReleaseRecord {
  const release = releases.get(releaseId);
  if (!release) {
    throw new Error(`Release not found: ${releaseId}`);
  }

  const merged = new Set([...release.featureIds, ...featureIds]);
  const updated: ReleaseRecord = {
    ...release,
    featureIds: Array.from(merged),
  };
  releases.set(releaseId, updated);
  return updated;
}

/**
 * Split an epic into multiple planned releases from specs.
 * Epic must exist in the operational registry.
 */
export function divideEpicIntoReleases(epicId: string, releaseSpecs: ReleaseSpec[]): ReleaseRecord[] {
  const epic = getEpic(epicId);
  if (!epic) {
    throw new Error(`Epic not found: ${epicId}`);
  }
  if (releaseSpecs.length === 0) {
    throw new Error("At least one release spec is required");
  }

  const created: ReleaseRecord[] = [];

  for (const spec of releaseSpecs) {
    const release: ReleaseRecord = {
      id: spec.id,
      epicId,
      programId: epic.programId,
      version: spec.version,
      title: spec.title,
      status: "planned",
      featureIds: spec.featureIds ?? [],
      targetDate: spec.targetDate,
    };
    registerRelease(release);
    created.push(release);
  }

  return created;
}

export function clearReleaseRegistry(): void {
  releases.clear();
}
