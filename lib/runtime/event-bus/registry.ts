/** ForgeOS Runtime Event Bus — event type registry (Epic 4.0). */

import type { RuntimeEventDefinition, RuntimeEventType } from "./types";

const EVENT_DEFINITIONS: RuntimeEventDefinition[] = [
  {
    type: "VENTURE_CREATED",
    category: "venture",
    label: "Venture Created",
    description: "A new venture was registered in the runtime.",
  },
  {
    type: "DISCOVERY_COMPLETED",
    category: "venture",
    label: "Discovery Completed",
    description: "Discovery stage finished for a venture.",
  },
  {
    type: "RESEARCH_COMPLETED",
    category: "venture",
    label: "Research Completed",
    description: "Research stage finished for a venture.",
  },
  {
    type: "CEO_DECISION_CREATED",
    category: "ceo",
    label: "CEO Decision Created",
    description: "The persistent CEO issued a new decision.",
  },
  {
    type: "BOARD_CONSENSUS_REACHED",
    category: "board",
    label: "Board Consensus Reached",
    description: "The executive board reached consensus on a venture.",
  },
  {
    type: "VENTURE_APPROVED",
    category: "venture",
    label: "Venture Approved",
    description: "A venture passed approval gates.",
  },
  {
    type: "BUILD_REQUESTED",
    category: "build",
    label: "Build Requested",
    description: "A build was requested for a venture.",
  },
  {
    type: "BUILD_COMPLETED",
    category: "build",
    label: "Build Completed",
    description: "A build run finished for a venture.",
  },
  {
    type: "MEMORY_UPDATED",
    category: "memory",
    label: "Memory Updated",
    description: "Company or venture memory was written.",
  },
  {
    type: "RISK_DETECTED",
    category: "capital",
    label: "Risk Detected",
    description: "A material risk was detected for a venture.",
  },
  {
    type: "OPPORTUNITY_DETECTED",
    category: "capital",
    label: "Opportunity Detected",
    description: "A growth or investment opportunity was detected.",
  },
  {
    type: "VENTURE_STATE_CHANGED",
    category: "venture",
    label: "Venture State Changed",
    description: "A venture transitioned to a new lifecycle state.",
  },
  {
    type: "VENTURE_BLOCKED",
    category: "venture",
    label: "Venture Blocked",
    description: "A venture was blocked pending resolution.",
  },
  {
    type: "VENTURE_PAUSED",
    category: "venture",
    label: "Venture Paused",
    description: "A venture was paused; pipeline work suspended.",
  },
  {
    type: "VENTURE_READY_FOR_BUILD",
    category: "venture",
    label: "Venture Ready for Build",
    description: "A venture entered BUILD readiness.",
  },
  {
    type: "VENTURE_READY_FOR_LAUNCH",
    category: "venture",
    label: "Venture Ready for Launch",
    description: "A venture entered LAUNCH readiness.",
  },
  {
    type: "VENTURE_READY_FOR_CAPITAL",
    category: "venture",
    label: "Venture Ready for Capital",
    description: "A venture entered CAPITAL readiness.",
  },
  {
    type: "WORKER_REGISTERED",
    category: "worker",
    label: "Worker Registered",
    description: "A worker was registered in the runtime registry.",
  },
  {
    type: "WORKER_STARTED",
    category: "worker",
    label: "Worker Started",
    description: "A worker began executing a task.",
  },
  {
    type: "WORKER_COMPLETED",
    category: "worker",
    label: "Worker Completed",
    description: "A worker finished a task successfully.",
  },
  {
    type: "WORKER_FAILED",
    category: "worker",
    label: "Worker Failed",
    description: "A worker task execution failed.",
  },
  {
    type: "WORKER_BLOCKED",
    category: "worker",
    label: "Worker Blocked",
    description: "A worker was blocked from executing.",
  },
  {
    type: "WORKER_PAUSED",
    category: "worker",
    label: "Worker Paused",
    description: "A worker was paused.",
  },
  {
    type: "WORKER_RESUMED",
    category: "worker",
    label: "Worker Resumed",
    description: "A paused worker resumed.",
  },
  {
    type: "WORKER_HEALTH_CHANGED",
    category: "worker",
    label: "Worker Health Changed",
    description: "A worker health level changed.",
  },
  {
    type: "TASK_CREATED",
    category: "task",
    label: "Task Created",
    description: "A task was enqueued in the runtime task queue.",
  },
  {
    type: "TASK_READY",
    category: "task",
    label: "Task Ready",
    description: "A task is ready for worker pickup.",
  },
  {
    type: "TASK_STARTED",
    category: "task",
    label: "Task Started",
    description: "A worker began processing a queued task.",
  },
  {
    type: "TASK_COMPLETED",
    category: "task",
    label: "Task Completed",
    description: "A queued task completed successfully.",
  },
  {
    type: "TASK_FAILED",
    category: "task",
    label: "Task Failed",
    description: "A queued task failed execution.",
  },
  {
    type: "TASK_RETRY",
    category: "task",
    label: "Task Retry",
    description: "A failed task was scheduled for retry.",
  },
  {
    type: "TASK_CANCELLED",
    category: "task",
    label: "Task Cancelled",
    description: "A queued task was cancelled.",
  },
  {
    type: "TASK_DEAD_LETTER",
    category: "task",
    label: "Task Dead Letter",
    description: "A task was moved to the dead letter queue.",
  },
  {
    type: "TASK_TIMEOUT",
    category: "task",
    label: "Task Timeout",
    description: "A queued task exceeded its timeout.",
  },
  {
    type: "EXECUTION_STARTED",
    category: "execution",
    label: "Execution Started",
    description: "The execution engine began processing a task.",
  },
  {
    type: "EXECUTION_FINISHED",
    category: "execution",
    label: "Execution Finished",
    description: "The execution engine completed a task run.",
  },
  {
    type: "EXECUTION_FAILED",
    category: "execution",
    label: "Execution Failed",
    description: "The execution engine failed to complete a task.",
  },
  {
    type: "WORKER_DISPATCHED",
    category: "execution",
    label: "Worker Dispatched",
    description: "A worker was selected and dispatched for execution.",
  },
  {
    type: "TASK_EXECUTED",
    category: "execution",
    label: "Task Executed",
    description: "A queued task was executed by a worker.",
  },
  {
    type: "SESSION_CREATED",
    category: "execution",
    label: "Session Created",
    description: "An execution session was created.",
  },
  {
    type: "SESSION_FINISHED",
    category: "execution",
    label: "Session Finished",
    description: "An execution session finished (success or failure).",
  },
];

const definitionByType = new Map<RuntimeEventType, RuntimeEventDefinition>(
  EVENT_DEFINITIONS.map((def) => [def.type, def]),
);

export function listEventDefinitions(): RuntimeEventDefinition[] {
  return [...EVENT_DEFINITIONS];
}

export function getEventDefinition(type: RuntimeEventType): RuntimeEventDefinition {
  const def = definitionByType.get(type);
  if (!def) {
    throw new Error(`Unknown runtime event type: ${type}`);
  }
  return def;
}

export function isRegisteredEventType(type: string): type is RuntimeEventType {
  return definitionByType.has(type as RuntimeEventType);
}

export function getEventCategory(type: RuntimeEventType) {
  return getEventDefinition(type).category;
}

export function listEventTypesByCategory(
  category: RuntimeEventDefinition["category"],
): RuntimeEventType[] {
  return EVENT_DEFINITIONS.filter((def) => def.category === category).map((def) => def.type);
}
