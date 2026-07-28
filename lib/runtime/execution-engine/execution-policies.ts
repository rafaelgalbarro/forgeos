/** ForgeOS Execution Engine — execution policies (Epic 4.5). */

import type { QueueTask } from "../task-queue/types";
import type { WorkerInstance } from "../workers/types";
import type { VentureState } from "../state-machine/types";

const BLOCKED_VENTURE_STATES: VentureState[] = ["EXIT", "ARCHIVED", "CAPITAL"];

const RESEARCH_WORKER_IDS = new Set(["research"]);
const BUILD_WORKER_IDS = new Set(["build", "engineering", "backend", "frontend", "database"]);

export interface VentureContextFlags {
  researchComplete: boolean;
  productComplete: boolean;
}

export function resolveVentureContextFlags(
  ventureId: string,
  queue: { getTasks: (filter?: { ventureId?: string }) => QueueTask[] },
): VentureContextFlags {
  const tasks = queue.getTasks({ ventureId });
  const researchComplete = tasks.some(
    (t) => t.type === "RESEARCH_RUN" && t.status === "COMPLETED",
  );
  const productComplete = tasks.some(
    (t) => t.type === "PRODUCT_UPDATE" && t.status === "COMPLETED",
  );
  return { researchComplete, productComplete };
}

export function validateWorkerForVentureState(
  worker: WorkerInstance,
  ventureState: VentureState,
  context: VentureContextFlags,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!worker.allowedStates.includes(ventureState)) {
    errors.push(
      `Worker ${worker.id} cannot run in venture state ${ventureState}`,
    );
  }

  if (BLOCKED_VENTURE_STATES.includes(ventureState)) {
    if (RESEARCH_WORKER_IDS.has(worker.id) || worker.department === "research") {
      errors.push(
        `Research worker blocked in venture state ${ventureState}`,
      );
    }
  }

  if (BUILD_WORKER_IDS.has(worker.id) || worker.department === "build" || worker.department === "engineering") {
    if (!context.researchComplete) {
      errors.push("Build worker blocked: research incomplete");
    }
    if (!context.productComplete) {
      errors.push("Build worker blocked: product incomplete");
    }
  }

  if (ventureState === "BLOCKED" || ventureState === "PAUSED") {
    warnings.push(`Venture is ${ventureState}; execution may be deferred`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function scoreWorkerCandidate(
  worker: WorkerInstance,
  task: QueueTask,
): number {
  let score = 0;

  if (worker.supportedTasks.includes(task.type)) score += 100;
  if (task.recommendedWorkerId === worker.id) score += 50;
  if (worker.status === "IDLE" || worker.status === "READY") score += 30;
  if (worker.status === "COMPLETED") score += 10;
  if (worker.status === "RUNNING") score -= 50;
  if (worker.status === "OFFLINE" || worker.status === "DEPRECATED") score -= 1000;
  if (worker.status === "BLOCKED" || worker.status === "FAILED") score -= 20;

  const priorityWeight: Record<string, number> = {
    P0_CRITICAL: 4,
    P1_HIGH: 3,
    P2_MEDIUM: 2,
    P3_LOW: 1,
  };
  score += (priorityWeight[task.priority] ?? 0) * 5;
  score += (priorityWeight[worker.priority] ?? 0) * 2;

  return score;
}

export function shouldRetryExecution(attemptCount: number, maxRetries: number): boolean {
  return attemptCount < maxRetries;
}
