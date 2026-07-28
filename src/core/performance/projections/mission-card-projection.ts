/**
 * PROGRAM 6100 — MissionCardProjection (light card for lists).
 */

import type { ProjectionMeta } from "./types";

export interface MissionCardProjection extends ProjectionMeta {
  missionId: string;
  ventureId: string;
  workspaceId: string;
  title: string;
  status: string;
  stage: string;
  outputCount: number;
  pendingDecisions: number;
  previewStatus: "READY" | "STARTING" | "NONE" | "FAILED";
  lastActivityAt: string;
}

export function buildMissionCardProjection(input: {
  missionId: string;
  ventureId: string;
  workspaceId: string;
  title: string;
  status: string;
  stage?: string;
  outputCount?: number;
  pendingDecisions?: number;
  previewStatus?: MissionCardProjection["previewStatus"];
  lastActivityAt?: string;
  sourceEvents?: string[];
}): MissionCardProjection {
  return {
    missionId: input.missionId,
    ventureId: input.ventureId,
    workspaceId: input.workspaceId,
    title: input.title,
    status: input.status,
    stage: input.stage || input.status,
    outputCount: input.outputCount ?? 0,
    pendingDecisions: input.pendingDecisions ?? 0,
    previewStatus: input.previewStatus ?? "NONE",
    lastActivityAt: input.lastActivityAt || new Date().toISOString(),
    version: 1,
    updatedAt: new Date().toISOString(),
    freshness: "LIVE",
    sourceEvents: input.sourceEvents || ["MissionSummaryChanged"],
  };
}
