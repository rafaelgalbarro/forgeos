/** ForgeOS Execution Engine — worker auto-selection (Epic 4.5). */

import type { QueueTask } from "../task-queue/types";
import type { WorkerRegistry, WorkerInstance } from "../workers/types";
import type { VentureState } from "../state-machine/types";
import {
  resolveVentureContextFlags,
  scoreWorkerCandidate,
  validateWorkerForVentureState,
} from "./execution-policies";
import type { RuntimeTaskQueue } from "../task-queue/types";
import type { WorkerDispatchResult } from "./types";

export class WorkerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerUnavailable";
  }
}

export function dispatchWorker(
  registry: WorkerRegistry,
  queue: RuntimeTaskQueue,
  task: QueueTask,
  ventureState: VentureState,
): WorkerDispatchResult {
  const workers = registry.list();
  const context = resolveVentureContextFlags(task.ventureId, queue);

  const candidates = workers.filter((w) => {
    if (!w.supportedTasks.includes(task.type)) return false;
    if (w.status === "OFFLINE" || w.status === "DEPRECATED") return false;
    if (task.recommendedWorkerId && task.recommendedWorkerId !== w.id) return false;
    const validation = validateWorkerForVentureState(w, ventureState, context);
    return validation.valid;
  });

  if (candidates.length === 0) {
    const reason = task.recommendedWorkerId
      ? `No compatible worker for task ${task.type} (recommended: ${task.recommendedWorkerId})`
      : `No compatible worker available for task ${task.type}`;
    return { worker: null, reason, unavailable: true };
  }

  const scored = candidates
    .map((w) => ({ worker: w, score: scoreWorkerCandidate(w, task) }))
    .sort((a, b) => b.score - a.score);

  const selected = scored[0].worker;
  return {
    worker: selected,
    reason: `Selected ${selected.id} (score ${scored[0].score})`,
    unavailable: false,
  };
}

export function listCompatibleWorkers(
  registry: WorkerRegistry,
  queue: RuntimeTaskQueue,
  task: QueueTask,
  ventureState: VentureState,
): WorkerInstance[] {
  const context = resolveVentureContextFlags(task.ventureId, queue);
  return registry.list().filter((w) => {
    if (!w.supportedTasks.includes(task.type)) return false;
    const validation = validateWorkerForVentureState(w, ventureState, context);
    return validation.valid;
  });
}
