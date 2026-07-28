/** PROGRAM 5300 — Live Mission UI types (client-safe, no heavy imports). */

import type { MissionPhase } from "@/lib/mission-control/types";

/** Visible task/mission states shown in UI — derived only from real events. */
export type LiveMissionVisibleState =
  | "QUEUED"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "PAUSED";

/** Canonical UI event types — transformed from existing system events only. */
export type LiveMissionUIEventType =
  | "mission_created"
  | "stage_started"
  | "department_started"
  | "task_queued"
  | "task_running"
  | "artifact_created"
  | "decision_requested"
  | "approval_required"
  | "task_completed"
  | "task_failed"
  | "stage_completed"
  | "mission_paused"
  | "mission_resumed";

export interface LiveMissionUIEvent {
  id: string;
  type: LiveMissionUIEventType;
  timestamp: string;
  label: string;
  department?: string;
  phase?: MissionPhase;
  taskId?: string;
  artifactId?: string;
  metadata?: Record<string, string>;
}

export interface LiveMissionTaskView {
  id: string;
  label: string;
  department?: string;
  state: LiveMissionVisibleState;
  progress: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface LiveMissionDepartmentView {
  department: string;
  state: LiveMissionVisibleState;
  label: string;
  lastAction?: string;
}

export interface LiveMissionArtifactView {
  id: string;
  label: string;
  type: string;
  phase: MissionPhase;
  createdAt: string;
  summary?: string;
}

export interface LiveMissionWarning {
  id: string;
  level: "warn" | "error";
  message: string;
  taskId?: string;
  timestamp: string;
}

/** Serializable snapshot for client polling / SSR — no engine internals. */
export interface LiveMissionSerializableSnapshot {
  missionId: string;
  generatedAt: string;
  stage: MissionPhase;
  progress: number;
  missionState: LiveMissionVisibleState;
  activeDepartments: LiveMissionDepartmentView[];
  queuedTasks: LiveMissionTaskView[];
  runningTasks: LiveMissionTaskView[];
  completedTasks: LiveMissionTaskView[];
  failedTasks: LiveMissionTaskView[];
  recentEvents: LiveMissionUIEvent[];
  generatedArtifacts: LiveMissionArtifactView[];
  estimatedRemainingTime: number;
  errorsAndWarnings: LiveMissionWarning[];
}
