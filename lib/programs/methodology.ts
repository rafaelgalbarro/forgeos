/** ForgeOS Master Program 2030 — delivery hierarchy helpers. */

import type {
  Epic,
  EpicRegistry,
  Feature,
  ProgramId,
  Release,
} from "./types";

export const METHODOLOGY_HIERARCHY = [
  "Vision",
  "Program",
  "Epic",
  "Feature",
  "Release",
  "Build",
] as const;

export type MethodologyLevel = (typeof METHODOLOGY_HIERARCHY)[number];

export function createEmptyEpicRegistry(): EpicRegistry {
  return { epics: [], features: [], releases: [] };
}

export function createEpic(
  programId: ProgramId,
  partial: Pick<Epic, "id" | "title" | "objective"> & Partial<Epic>,
): Epic {
  const now = new Date().toISOString();
  return {
    programId,
    status: "draft",
    pillarIds: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function createFeature(
  programId: ProgramId,
  epicId: string,
  partial: Pick<Feature, "id" | "title" | "description"> & Partial<Feature>,
): Feature {
  const now = new Date().toISOString();
  return {
    programId,
    epicId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function createRelease(
  programId: ProgramId,
  partial: Pick<Release, "id" | "version" | "title"> & Partial<Release>,
): Release {
  return {
    programId,
    status: "planned",
    featureIds: [],
    ...partial,
  };
}

export function getEpicsForProgram(registry: EpicRegistry, programId: ProgramId): Epic[] {
  return registry.epics.filter((e) => e.programId === programId);
}

export function getFeaturesForEpic(registry: EpicRegistry, epicId: string): Feature[] {
  return registry.features.filter((f) => f.epicId === epicId);
}

export function getReleasesForProgram(registry: EpicRegistry, programId: ProgramId): Release[] {
  return registry.releases.filter((r) => r.programId === programId);
}

export function describeHierarchy(): string {
  return METHODOLOGY_HIERARCHY.join(" → ");
}
