import { createWorkflowEvent, WORKFLOW_EVENTS, type WorkflowEvent } from "./events";
import { WorkflowEngine, createWorkflowEngine } from "./workflow-engine";
import type { WorkflowContext } from "./workflow-context";

export interface WorkflowRunResult {
  context: WorkflowContext;
  events: WorkflowEvent[];
  completedWorkerIds: string[];
}

export interface WorkflowRunnerOptions {
  ventureId: string;
  onWorkerStart?: (workerId: string) => void;
  onWorkerComplete?: (workerId: string, event: WorkflowEvent | null) => void;
  onEvent?: (event: WorkflowEvent) => void;
  executeWorker: (workerId: string) => Promise<void>;
}

/**
 * Runs the workflow pipeline. The orchestrator (BuildFlow) supplies executeWorker.
 * WorkflowEngine decides order; runner invokes workers sequentially.
 */
export async function runWorkflow(options: WorkflowRunnerOptions): Promise<WorkflowRunResult> {
  const engine = createWorkflowEngine();
  const events: WorkflowEvent[] = [];
  const completedWorkerIds: string[] = [];

  const context = engine.startBuild(options.ventureId);
  events.push(createWorkflowEvent(WORKFLOW_EVENTS.FOUNDER_APPROVED, options.ventureId));

  let workerId = engine.nextWorker();
  while (workerId) {
    options.onWorkerStart?.(workerId);
    await options.executeWorker(workerId);
    completedWorkerIds.push(workerId);

    const completionEvent = engine.completeWorker(workerId);
    if (completionEvent) {
      events.push(completionEvent);
      options.onEvent?.(completionEvent);
    }
    options.onWorkerComplete?.(workerId, completionEvent ?? null);

    workerId = engine.nextWorker();
  }

  return {
    context: engine.getContext() ?? context,
    events,
    completedWorkerIds,
  };
}

export { createWorkflowEngine };
