/** ForgeOS Runtime Scheduler — type contracts (Epic 4.1). */

import type { RuntimeEventType } from "../event-bus/types";

export type SchedulerTaskType =
  | "DISCOVERY_REVIEW"
  | "RESEARCH_RUN"
  | "PRODUCT_UPDATE"
  | "CEO_REVIEW"
  | "BOARD_REVIEW"
  | "SIMULATOR_UPDATE"
  | "BUILD_PLAN_UPDATE"
  | "MEMORY_WRITE"
  | "RISK_REVIEW"
  | "OPPORTUNITY_REVIEW";

export type TaskPriority = "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW";

export type TaskStatus =
  | "pending"
  | "ready"
  | "blocked"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface PriorityContext {
  ventureId: string;
  taskType: SchedulerTaskType;
  severity?: "low" | "medium" | "high" | "critical";
  impact?: "low" | "medium" | "high";
  ventureBlocked?: boolean;
  hasPendingDecision?: boolean;
  researchIncomplete?: boolean;
  productIncomplete?: boolean;
  memoryPending?: boolean;
}

export interface SchedulerTask {
  id: string;
  type: SchedulerTaskType;
  ventureId: string;
  priority: TaskPriority;
  status: TaskStatus;
  sourceEventId: string;
  sourceEventType: RuntimeEventType;
  /** Task IDs this task depends on (must complete first). */
  dependsOn: string[];
  /** Declared task-type dependencies for this venture. */
  dependencyTypes: SchedulerTaskType[];
  label: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ExecutionPlanWave {
  waveIndex: number;
  taskIds: string[];
}

export interface ExecutionPlan {
  id: string;
  ventureId: string | null;
  orderedTaskIds: string[];
  waves: ExecutionPlanWave[];
  readyTaskIds: string[];
  blockedTaskIds: string[];
  generatedAt: string;
}

export interface SchedulerSnapshot {
  tasks: SchedulerTask[];
  plan: ExecutionPlan | null;
  taskCountByStatus: Record<TaskStatus, number>;
  taskCountByPriority: Record<TaskPriority, number>;
}

export interface RuntimeSchedulerOptions {
  maxTasks?: number;
}

export interface RuntimeScheduler {
  ingestEvent(eventId: string, type: RuntimeEventType, payload: Record<string, unknown>): SchedulerTask[];
  getTasks(filter?: { ventureId?: string; status?: TaskStatus }): SchedulerTask[];
  getTask(id: string): SchedulerTask | undefined;
  getExecutionPlan(ventureId?: string): ExecutionPlan;
  getSnapshot(ventureId?: string): SchedulerSnapshot;
  clear(): void;
}

export interface TaskDependencyRule {
  taskType: SchedulerTaskType;
  dependsOnTypes: SchedulerTaskType[];
}
