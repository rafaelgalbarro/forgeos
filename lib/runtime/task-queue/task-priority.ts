/** Task queue priorities with weight, timeout, and maxRetries (Epic 4.4). */

export type QueueTaskPriority = "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW";

export interface PriorityConfig {
  weight: number;
  timeoutMs: number;
  maxRetries: number;
}

export const PRIORITY_CONFIG: Record<QueueTaskPriority, PriorityConfig> = {
  P0_CRITICAL: { weight: 1000, timeoutMs: 60_000, maxRetries: 5 },
  P1_HIGH: { weight: 750, timeoutMs: 120_000, maxRetries: 5 },
  P2_MEDIUM: { weight: 500, timeoutMs: 300_000, maxRetries: 3 },
  P3_LOW: { weight: 250, timeoutMs: 600_000, maxRetries: 3 },
};

export const QUEUE_PRIORITY_LABELS: Record<QueueTaskPriority, string> = {
  P0_CRITICAL: "P0 — Critical",
  P1_HIGH: "P1 — High",
  P2_MEDIUM: "P2 — Medium",
  P3_LOW: "P3 — Low",
};

export const PRIORITY_ORDER: Record<QueueTaskPriority, number> = {
  P0_CRITICAL: 0,
  P1_HIGH: 1,
  P2_MEDIUM: 2,
  P3_LOW: 3,
};

export function compareQueuePriority(a: QueueTaskPriority, b: QueueTaskPriority): number {
  return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}

export function getPriorityWeight(priority: QueueTaskPriority): number {
  return PRIORITY_CONFIG[priority].weight;
}

export function getPriorityTimeout(priority: QueueTaskPriority): number {
  return PRIORITY_CONFIG[priority].timeoutMs;
}

export function getPriorityMaxRetries(priority: QueueTaskPriority): number {
  return PRIORITY_CONFIG[priority].maxRetries;
}
