/** Priority heuristics for runtime tasks (Epic 4.1). */

import type { PriorityContext, SchedulerTaskType, TaskPriority } from "./types";

export const P0_CRITICAL: TaskPriority = "P0_CRITICAL";
export const P1_HIGH: TaskPriority = "P1_HIGH";
export const P2_MEDIUM: TaskPriority = "P2_MEDIUM";
export const P3_LOW: TaskPriority = "P3_LOW";

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  P0_CRITICAL: 0,
  P1_HIGH: 1,
  P2_MEDIUM: 2,
  P3_LOW: 3,
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0_CRITICAL: "P0 — Critical",
  P1_HIGH: "P1 — High",
  P2_MEDIUM: "P2 — Medium",
  P3_LOW: "P3 — Low",
};

const DECISION_TASKS: SchedulerTaskType[] = ["CEO_REVIEW", "BOARD_REVIEW"];
const RESEARCH_TASKS: SchedulerTaskType[] = ["RESEARCH_RUN", "DISCOVERY_REVIEW"];
const PRODUCT_TASKS: SchedulerTaskType[] = ["PRODUCT_UPDATE", "BUILD_PLAN_UPDATE"];
const MEMORY_TASKS: SchedulerTaskType[] = ["MEMORY_WRITE"];
const GENERAL_TASKS: SchedulerTaskType[] = ["SIMULATOR_UPDATE", "OPPORTUNITY_REVIEW"];

/** Assign priority using venture context and task type heuristics. */
export function assignPriority(context: PriorityContext): TaskPriority {
  if (context.severity === "critical" || context.ventureBlocked) {
    return P0_CRITICAL;
  }

  if (context.hasPendingDecision || DECISION_TASKS.includes(context.taskType)) {
    return P1_HIGH;
  }

  if (context.researchIncomplete || RESEARCH_TASKS.includes(context.taskType)) {
    return P1_HIGH;
  }

  if (context.taskType === "RISK_REVIEW" && context.severity === "high") {
    return P1_HIGH;
  }

  if (context.productIncomplete || PRODUCT_TASKS.includes(context.taskType)) {
    return P2_MEDIUM;
  }

  if (context.memoryPending || MEMORY_TASKS.includes(context.taskType)) {
    return P2_MEDIUM;
  }

  if (GENERAL_TASKS.includes(context.taskType)) {
    return P3_LOW;
  }

  if (context.taskType === "OPPORTUNITY_REVIEW" && context.impact === "high") {
    return P2_MEDIUM;
  }

  return P3_LOW;
}

export function comparePriority(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}
