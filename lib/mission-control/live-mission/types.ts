/** PROGRAM 5300 — Live Mission types (coordinator layer). */

import type { MissionPhase } from "../types";

export type TaskStatus = "Queued" | "Running" | "Waiting" | "Completed" | "Failed";

export type MissionEventType =
  | "user_message"
  | "ceo_response"
  | "intention_classified"
  | "phase_advance"
  | "factory_step"
  | "deploy_stub"
  | "decision_resolved"
  | "risk_detected"
  | "discovery"
  | "execution"
  | "system"
  | "worker_start"
  | "worker_complete"
  | "task_progress"
  | "task_complete"
  | "checkpoint_saved"
  | "approval_required"
  | "approval_resolved"
  | "autonomous_paused"
  | "autonomous_resumed"
  | "queue_updated"
  | "gtm"
  | "company_feedback"
  | "company_incident"
  | "company_kpi";

export interface MissionEvent {
  id: string;
  timestamp: string;
  type: MissionEventType;
  label: string;
  phase?: MissionPhase;
  icon?: string;
  department?: string;
  metadata?: Record<string, string>;
}

export interface MissionTask {
  id: string;
  label: string;
  department?: string;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeedItem {
  id: string;
  timestamp: string;
  source: "research" | "build" | "deployment" | "system";
  label: string;
  status?: TaskStatus;
}

export type DepartmentId = "CEO" | "Research" | "CTO" | "CMO" | "CFO" | "Legal";

export interface DepartmentActivity {
  department: DepartmentId;
  status: "idle" | "active" | "waiting" | "done";
  label: string;
  lastAction?: string;
}

export interface MissionLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

export interface LiveMissionState {
  tasks: MissionTask[];
  events: MissionEvent[];
  researchFeed: FeedItem[];
  buildFeed: FeedItem[];
  deploymentFeed: FeedItem[];
  departmentActivity: DepartmentActivity[];
  logs: MissionLogEntry[];
  progressPercent: number;
  progressPhase: MissionPhase;
}

export interface LiveMissionSnapshot {
  missionId: string;
  generatedAt: string;
  state: LiveMissionState;
}
