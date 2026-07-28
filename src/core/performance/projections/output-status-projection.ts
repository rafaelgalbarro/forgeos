/**
 * PROGRAM 6100 — OutputStatusProjection.
 */

import type { ProjectionMeta } from "./types";

export interface OutputStatusProjection extends ProjectionMeta {
  outputId: string;
  missionId: string;
  ventureId: string;
  title: string;
  kind: string;
  status: string;
  outputVersion: string;
  hasPreview: boolean;
}

export function buildOutputStatusProjection(input: {
  outputId: string;
  missionId: string;
  ventureId: string;
  title: string;
  kind: string;
  status: string;
  outputVersion?: string;
  hasPreview?: boolean;
}): OutputStatusProjection {
  return {
    outputId: input.outputId,
    missionId: input.missionId,
    ventureId: input.ventureId,
    title: input.title,
    kind: input.kind,
    status: input.status,
    outputVersion: input.outputVersion || "1",
    hasPreview: input.hasPreview ?? false,
    version: 1,
    updatedAt: new Date().toISOString(),
    freshness: "LIVE",
    sourceEvents: ["OutputStatusChanged"],
  };
}
