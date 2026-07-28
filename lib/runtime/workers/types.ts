/** ForgeOS Worker Runtime — type contracts (Epic 4.3). */

import type { SchedulerTaskType, TaskPriority } from "../scheduler/types";
import type { VentureState } from "../state-machine/types";
import type { WorkerHealthLevel } from "./health";
import type { WorkerStatus } from "./worker-status";

export type WorkerDepartment =
  | "executive"
  | "research"
  | "product"
  | "design"
  | "engineering"
  | "quality"
  | "growth"
  | "finance"
  | "legal"
  | "operations"
  | "capital"
  | "knowledge"
  | "analytics"
  | "build"
  | "deployment";

/** Worker-specific task identifiers (beyond scheduler task types). */
export type WorkerTaskType = string;

export type SupportedTask = SchedulerTaskType | WorkerTaskType;

export interface WorkerCapability {
  id: string;
  label: string;
  description?: string;
}

export interface WorkerHealthSnapshot {
  level: WorkerHealthLevel;
  lastExecutionAt: string | null;
  lastErrorAt: string | null;
  errorCount: number;
  successCount: number;
  failureCount: number;
  avgExecutionMs: number;
  consecutiveFailures: number;
}

export interface WorkerDefinition {
  id: string;
  name: string;
  description: string;
  department: WorkerDepartment;
  capabilities: WorkerCapability[];
  priority: TaskPriority;
  requiredContext: string[];
  allowedStates: VentureState[];
  supportedTasks: SupportedTask[];
  version: string;
}

export interface WorkerInstance extends WorkerDefinition {
  status: WorkerStatus;
  health: WorkerHealthSnapshot;
  registeredAt: string;
  updatedAt: string;
}

export interface WorkerTaskRequest {
  workerId: string;
  taskType: SupportedTask;
  ventureId: string;
  ventureState: VentureState;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkerTaskResult {
  success: boolean;
  workerId: string;
  taskType: SupportedTask;
  ventureId: string;
  taskId: string;
  status: WorkerStatus;
  durationMs: number;
  output: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  mock: true;
}

export interface WorkerRegistryQuery {
  department?: WorkerDepartment;
  status?: WorkerStatus;
  capability?: string;
  taskType?: SupportedTask;
  ventureState?: VentureState;
  healthLevel?: WorkerHealthLevel;
  version?: string;
}

export interface WorkerRegistry {
  register(worker: WorkerDefinition): WorkerInstance;
  unregister(workerId: string): boolean;
  find(workerId: string): WorkerInstance | undefined;
  list(): WorkerInstance[];
  filter(query: WorkerRegistryQuery): WorkerInstance[];
  queryByCapability(capabilityId: string): WorkerInstance[];
  queryByStatus(status: WorkerStatus): WorkerInstance[];
  queryByVersion(version: string): WorkerInstance[];
  queryByHealth(level: WorkerHealthLevel): WorkerInstance[];
  clear(): void;
}
