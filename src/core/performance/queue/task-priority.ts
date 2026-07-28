/**
 * PROGRAM 6100 — Task priority types for load planning layer.
 * Reuses existing Runtime/Scheduler — does NOT create parallel scheduler.
 */

export type LoadTaskPriority =
  | "INTERACTIVE"
  | "HIGH_PRIORITY"
  | "STANDARD"
  | "BACKGROUND"
  | "LOW_PRIORITY"
  | "MAINTENANCE";

export const PRIORITY_ORDER: Record<LoadTaskPriority, number> = {
  INTERACTIVE: 0,
  HIGH_PRIORITY: 1,
  STANDARD: 2,
  BACKGROUND: 3,
  LOW_PRIORITY: 4,
  MAINTENANCE: 5,
};

export interface LoadPlanTask {
  id: string;
  type: string;
  priority: LoadTaskPriority;
  workspaceId: string;
  ventureId?: string;
  missionId?: string;
  timeoutMs?: number;
  maxRetries?: number;
  cancellable?: boolean;
  enqueuedAt: string;
  status: "PENDING" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
}
