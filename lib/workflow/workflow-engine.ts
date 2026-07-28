import { createWorkflowEvent, WORKFLOW_EVENTS, type WorkflowEvent, type WorkflowEventType } from "./events";
import type { WorkflowContext } from "./workflow-context";
import { createWorkflowContext, markWorkerComplete, withEvent } from "./workflow-context";
import { getCompletionEventForWorker, getTransition, getWorkersForEvent } from "./workflow-registry";
import type { WorkflowLogger } from "./workflow-logger";
import { workflowLogger } from "./workflow-logger";

export interface WorkflowEngineOptions {
  logger?: WorkflowLogger;
}

export class WorkflowEngine {
  private context: WorkflowContext | null = null;
  private activeTrigger: WorkflowEventType | null = null;
  private readonly logger: WorkflowLogger;

  constructor(options: WorkflowEngineOptions = {}) {
    this.logger = options.logger ?? workflowLogger;
  }

  getContext(): WorkflowContext | null {
    return this.context;
  }

  /** Initialize build workflow after founder approval. */
  startBuild(ventureId: string): WorkflowContext {
    const workers = getWorkersForEvent(WORKFLOW_EVENTS.FOUNDER_APPROVED);
    this.context = createWorkflowContext(ventureId, workers);
    this.activeTrigger = WORKFLOW_EVENTS.FOUNDER_APPROVED;
    this.emit(createWorkflowEvent(WORKFLOW_EVENTS.FOUNDER_APPROVED, ventureId));
    return this.context;
  }

  /** Returns the next worker id to execute, or null if pipeline is complete. */
  nextWorker(): string | null {
    if (!this.context) return null;
    return this.context.pendingWorkers[0] ?? null;
  }

  /** Call after orchestrator finishes a worker. */
  completeWorker(workerId: string): WorkflowEvent | null {
    if (!this.context || !this.activeTrigger) return null;

    this.context = markWorkerComplete(this.context, workerId);
    this.logger.info(`Worker completed: ${workerId}`, createWorkflowEvent(this.activeTrigger, this.context.ventureId, { workerId }));

    const completionType = getCompletionEventForWorker(this.activeTrigger, workerId);
    if (!completionType) return null;

    const event = createWorkflowEvent(completionType, this.context.ventureId, { workerId });
    return this.emit(event);
  }

  emit(event: WorkflowEvent): WorkflowEvent {
    if (this.context) {
      this.context = withEvent(this.context, event.type);
    }
    this.logger.info(`Event: ${event.type}`, event);

    const transition = getTransition(event.type);
    if (transition.workers.length > 0) {
      this.activeTrigger = event.type;
      if (this.context) {
        this.context = {
          ...this.context,
          pendingWorkers: [...transition.workers],
        };
      }
    }

    if (transition.onComplete && this.context && this.context.pendingWorkers.length === 0) {
      this.emit(createWorkflowEvent(transition.onComplete, event.ventureId));
    }

    return event;
  }

  isComplete(): boolean {
    return this.context !== null && this.context.pendingWorkers.length === 0;
  }
}

export function createWorkflowEngine(options?: WorkflowEngineOptions): WorkflowEngine {
  return new WorkflowEngine(options);
}
