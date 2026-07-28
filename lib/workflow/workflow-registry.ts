import type { WorkflowEvent, WorkflowEventType } from "./events";
import { WORKFLOW_EVENTS } from "./events";

export interface WorkflowTransition {
  /** Workers to run when this event fires (in order). */
  workers: string[];
  /** Event emitted after each worker in `workers` completes (keyed by worker id). */
  workerCompletionEvents: Partial<Record<string, WorkflowEventType>>;
  /** Event emitted when all workers in this transition finish. */
  onComplete?: WorkflowEventType;
}

/** Full build pipeline keyed by triggering event. */
export const WORKFLOW_REGISTRY: Record<WorkflowEventType, WorkflowTransition> = {
  [WORKFLOW_EVENTS.PROJECT_CREATED]: {
    workers: [],
    workerCompletionEvents: {},
    onComplete: WORKFLOW_EVENTS.INTELLIGENCE_COMPLETED,
  },
  [WORKFLOW_EVENTS.INTELLIGENCE_COMPLETED]: {
    workers: [],
    workerCompletionEvents: {},
  },
  [WORKFLOW_EVENTS.FOUNDER_APPROVED]: {
    workers: [
      "ceo",
      "founder",
      "research",
      "product",
      "ux",
      "cto",
      "database",
      "backend",
      "frontend",
      "marketing",
      "legal",
      "qa",
    ],
    workerCompletionEvents: {
      product: WORKFLOW_EVENTS.PRODUCT_READY,
      ux: WORKFLOW_EVENTS.UX_READY,
      database: WORKFLOW_EVENTS.DATABASE_READY,
      backend: WORKFLOW_EVENTS.BACKEND_READY,
      qa: WORKFLOW_EVENTS.PROJECT_COMPLETED,
    },
  },
  [WORKFLOW_EVENTS.PRODUCT_READY]: { workers: [], workerCompletionEvents: {} },
  [WORKFLOW_EVENTS.UX_READY]: { workers: [], workerCompletionEvents: {} },
  [WORKFLOW_EVENTS.DATABASE_READY]: { workers: [], workerCompletionEvents: {} },
  [WORKFLOW_EVENTS.BACKEND_READY]: { workers: [], workerCompletionEvents: {} },
  [WORKFLOW_EVENTS.PROJECT_COMPLETED]: { workers: [], workerCompletionEvents: {} },
};

export function getTransition(event: WorkflowEventType): WorkflowTransition {
  return WORKFLOW_REGISTRY[event];
}

export function getCompletionEventForWorker(
  triggerEvent: WorkflowEventType,
  workerId: string
): WorkflowEventType | null {
  return WORKFLOW_REGISTRY[triggerEvent].workerCompletionEvents[workerId] ?? null;
}

export function getWorkersForEvent(event: WorkflowEventType): string[] {
  return [...WORKFLOW_REGISTRY[event].workers];
}
