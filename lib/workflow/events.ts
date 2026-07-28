export const WORKFLOW_EVENTS = {
  PROJECT_CREATED: "PROJECT_CREATED",
  INTELLIGENCE_COMPLETED: "INTELLIGENCE_COMPLETED",
  FOUNDER_APPROVED: "FOUNDER_APPROVED",
  PRODUCT_READY: "PRODUCT_READY",
  UX_READY: "UX_READY",
  DATABASE_READY: "DATABASE_READY",
  BACKEND_READY: "BACKEND_READY",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
} as const;

export type WorkflowEventType = (typeof WORKFLOW_EVENTS)[keyof typeof WORKFLOW_EVENTS];

export interface WorkflowEvent {
  type: WorkflowEventType;
  ventureId: string;
  timestamp: string;
  workerId?: string;
  payload?: Record<string, unknown>;
}

export function createWorkflowEvent(
  type: WorkflowEventType,
  ventureId: string,
  options?: { workerId?: string; payload?: Record<string, unknown> }
): WorkflowEvent {
  return {
    type,
    ventureId,
    timestamp: new Date().toISOString(),
    workerId: options?.workerId,
    payload: options?.payload,
  };
}
