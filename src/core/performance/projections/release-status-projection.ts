/**
 * PROGRAM 6100 — ReleaseStatusProjection.
 */

import type { ProjectionMeta } from "./types";

export interface ReleaseStatusProjection extends ProjectionMeta {
  releaseId: string;
  ventureId: string;
  missionId: string;
  releaseVersion: string;
  status: string;
  environment?: string;
}

export function buildReleaseStatusProjection(input: {
  releaseId: string;
  ventureId: string;
  missionId: string;
  releaseVersion: string;
  status: string;
  environment?: string;
}): ReleaseStatusProjection {
  return {
    releaseId: input.releaseId,
    ventureId: input.ventureId,
    missionId: input.missionId,
    releaseVersion: input.releaseVersion,
    status: input.status,
    environment: input.environment,
    version: 1,
    updatedAt: new Date().toISOString(),
    freshness: "LIVE",
    sourceEvents: ["ReleaseStatusChanged"],
  };
}
