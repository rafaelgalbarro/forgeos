/**
 * PROGRAM 6100 — WorkflowProgressProjection.
 */

import type { ProjectionMeta } from "./types";

export interface WorkflowStageProgress {
  stageId: string;
  label: string;
  status: string;
  completedAt?: string;
}

export interface WorkflowProgressProjection extends ProjectionMeta {
  missionId: string;
  ventureId: string;
  workflowStatus: string;
  currentStageId?: string;
  stages: WorkflowStageProgress[];
  percentComplete: number;
}

export function buildWorkflowProgressProjection(input: {
  missionId: string;
  ventureId: string;
  workflowStatus: string;
  stages: WorkflowStageProgress[];
  currentStageId?: string;
}): WorkflowProgressProjection {
  const completed = input.stages.filter((s) => s.status === "completed" || s.status === "done").length;
  const total = input.stages.length || 1;
  return {
    missionId: input.missionId,
    ventureId: input.ventureId,
    workflowStatus: input.workflowStatus,
    currentStageId: input.currentStageId,
    stages: input.stages,
    percentComplete: Math.round((completed / total) * 100),
    version: 1,
    updatedAt: new Date().toISOString(),
    freshness: "LIVE",
    sourceEvents: ["WorkflowProgressChanged"],
  };
}
