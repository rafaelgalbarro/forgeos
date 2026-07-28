/** ForgeOS Runtime Scheduler — public API (Epic 4.1). */

export type {
  SchedulerTaskType,
  TaskPriority,
  TaskStatus,
  SchedulerTask,
  ExecutionPlan,
  ExecutionPlanWave,
  SchedulerSnapshot,
  RuntimeScheduler,
  RuntimeSchedulerOptions,
  PriorityContext,
  TaskDependencyRule,
} from "./types";

export {
  P0_CRITICAL,
  P1_HIGH,
  P2_MEDIUM,
  P3_LOW,
  PRIORITY_ORDER,
  PRIORITY_LABELS,
  assignPriority,
  comparePriority,
} from "./priority";

export {
  canTransition,
  assertValidTransition,
  resolveDependencyStatus,
  STATUS_LABELS,
} from "./task-status";

export {
  TASK_DEPENDENCY_RULES,
  BUILD_DEPENDENCY_TYPES,
  getDependencyTypesForTask,
  resolveTaskDependencies,
  areDependenciesMet,
  hasBlockingDependencies,
  topologicalSort,
} from "./dependencies";

export { SchedulerStore, nextTaskId } from "./scheduler-store";

export { buildExecutionPlan } from "./task-planner";

export {
  createRuntimeScheduler,
  connectSchedulerToEventBus,
  getSharedRuntimeScheduler,
  resetSharedRuntimeScheduler,
  SUBSCRIBED_EVENTS,
  TASK_LABELS,
} from "./scheduler";

export type { ConnectedRuntimeScheduler } from "./scheduler";
