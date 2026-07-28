/** ForgeOS Venture State Machine — scheduler task recommendations (Epic 4.2). */

import type { SchedulerTaskType } from "../scheduler/types";
import { getStateLabel } from "./states";
import type { SchedulerTaskRecommendation, VentureState } from "./types";

const SCHEDULER_TASK_LABELS: Record<SchedulerTaskType, string> = {
  DISCOVERY_REVIEW: "Discovery review",
  RESEARCH_RUN: "Research run",
  PRODUCT_UPDATE: "Product update",
  CEO_REVIEW: "CEO review",
  BOARD_REVIEW: "Board review",
  SIMULATOR_UPDATE: "Simulator update",
  BUILD_PLAN_UPDATE: "Build plan update",
  MEMORY_WRITE: "Memory write",
  RISK_REVIEW: "Risk review",
  OPPORTUNITY_REVIEW: "Opportunity review",
};

/** Recommendation-only task types not yet in SchedulerTaskType (Epic 4.1). */
const RECOMMENDATION_ONLY: Record<string, string> = {
  QA_CHECK: "QA check (recommendation — add to scheduler in Epic 4.3+)",
  LAUNCH_PREP: "Launch prep (recommendation — add to scheduler in Epic 4.3+)",
};

const TRANSITION_TASK_MAP: Partial<
  Record<VentureState, SchedulerTaskType | string>
> = {
  DISCOVERY: "RESEARCH_RUN",
  RESEARCH: "PRODUCT_UPDATE",
  PRODUCT: "BUILD_PLAN_UPDATE",
  BUILD: "QA_CHECK",
  QA: "LAUNCH_PREP",
};

export function getSchedulerTaskLabel(taskType: SchedulerTaskType | string): string {
  if (taskType in SCHEDULER_TASK_LABELS) {
    return SCHEDULER_TASK_LABELS[taskType as SchedulerTaskType];
  }
  return RECOMMENDATION_ONLY[taskType] ?? taskType;
}

/** Suggest scheduler tasks after a successful state transition (no execution). */
export function suggestSchedulerTasks(
  from: VentureState,
  to: VentureState,
): SchedulerTaskRecommendation[] {
  const taskType = TRANSITION_TASK_MAP[from];
  if (!taskType) return [];

  const label = getSchedulerTaskLabel(taskType);
  const note =
    taskType in RECOMMENDATION_ONLY
      ? RECOMMENDATION_ONLY[taskType]
      : undefined;

  return [
    {
      taskType,
      label,
      from,
      to,
      note,
    },
  ];
}

/** Milestone events emitted when entering readiness states. */
export function getReadinessMilestone(to: VentureState): VentureState | null {
  if (to === "BUILD") return "BUILD";
  if (to === "LAUNCH") return "LAUNCH";
  if (to === "CAPITAL") return "CAPITAL";
  return null;
}

export function formatTransitionSummary(from: VentureState, to: VentureState): string {
  return `${getStateLabel(from)} → ${getStateLabel(to)}`;
}
