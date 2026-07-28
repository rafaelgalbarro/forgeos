/** PROGRAM 5500 — Autonomous Build types. */

import type { MissionPhase } from "../types";
import type { MissionTask } from "../live-mission/types";

export const AUTONOMOUS_BUILD_VERSION = "PROGRAM 5500 — AUTONOMOUS BUILD";

export type ApprovalReason = "deploy" | "spend" | "delete" | "irreversible";

export type AutonomousStatus =
  | "idle"
  | "running"
  | "paused"
  | "awaiting_approval"
  | "completed";

export type WorkerId =
  | "CEO"
  | "Research"
  | "CTO"
  | "CMO"
  | "CFO"
  | "Legal"
  | "WebsiteFactory"
  | "AppFactory"
  | "MobileFactory";

export interface MissionWorker {
  id: WorkerId;
  label: string;
  department: string;
  busy: boolean;
  currentTaskId?: string;
}

export interface Checkpoint {
  id: string;
  missionId: string;
  phase: MissionPhase;
  taskIndex: number;
  timestamp: string;
  queueSnapshot: MissionTask[];
  completedTaskIds: string[];
}

export interface ApprovalGate {
  id: string;
  reason: ApprovalReason;
  title: string;
  description: string;
  taskId: string;
  taskLabel: string;
  resolved: boolean;
  approved?: boolean;
}

export interface AutonomousState {
  status: AutonomousStatus;
  enabled: boolean;
  pausedByUser: boolean;
  tasks: MissionTask[];
  currentTaskId?: string;
  completedTaskIds: string[];
  pendingApproval?: ApprovalGate;
  checkpoints: Checkpoint[];
  lastCheckpointId?: string;
  etaSeconds: number;
  workers: MissionWorker[];
  updatedAt: string;
}

export interface AutonomousTickResult {
  state: AutonomousState;
  event?: string;
  needsApproval?: ApprovalGate;
  checkpointSaved?: Checkpoint;
}

export interface AutonomousPanelView {
  currentTask?: MissionTask;
  completedTasks: MissionTask[];
  nextTask?: MissionTask;
  etaSeconds: number;
  status: AutonomousStatus;
}
