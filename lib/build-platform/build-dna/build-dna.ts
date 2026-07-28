/** Build DNA — core entity factory (Epic 6.1). */

import type { BuildDna, BuildDnaMeta } from "./types";

export function createBuildDnaMeta(
  ventureId: string,
  ventureName: string,
  completenessScore = 0,
): BuildDnaMeta {
  const now = new Date().toISOString();
  return {
    ventureId,
    ventureName,
    version: 1,
    createdAt: now,
    updatedAt: now,
    completenessScore,
    readyForGeneration: false,
  };
}

export function refreshBuildDnaMeta(
  dna: BuildDna,
  completenessScore: number,
  readyForGeneration: boolean,
): BuildDna {
  return {
    ...dna,
    meta: {
      ...dna.meta,
      updatedAt: new Date().toISOString(),
      completenessScore,
      readyForGeneration,
    },
  };
}

export function bumpBuildDnaVersion(dna: BuildDna): BuildDna {
  return {
    ...dna,
    meta: {
      ...dna.meta,
      version: dna.meta.version + 1,
      updatedAt: new Date().toISOString(),
    },
  };
}
