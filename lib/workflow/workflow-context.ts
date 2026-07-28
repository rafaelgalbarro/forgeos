import type { WorkflowEventType } from "./events";

export interface WorkflowContext {
  ventureId: string;
  lastEvent: WorkflowEventType | null;
  completedWorkers: string[];
  pendingWorkers: string[];
  metadata: Record<string, unknown>;
}

export function createWorkflowContext(ventureId: string, pendingWorkers: string[]): WorkflowContext {
  return {
    ventureId,
    lastEvent: null,
    completedWorkers: [],
    pendingWorkers: [...pendingWorkers],
    metadata: {},
  };
}

export function markWorkerComplete(context: WorkflowContext, workerId: string): WorkflowContext {
  return {
    ...context,
    completedWorkers: [...context.completedWorkers, workerId],
    pendingWorkers: context.pendingWorkers.filter((id) => id !== workerId),
  };
}

export function withEvent(context: WorkflowContext, event: WorkflowEventType): WorkflowContext {
  return { ...context, lastEvent: event };
}
