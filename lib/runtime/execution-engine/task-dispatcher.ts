/** ForgeOS Execution Engine — task selection (Epic 4.5). */

import type { RuntimeTaskQueue } from "../task-queue/types";
import type { RuntimeScheduler } from "../scheduler/types";
import type { WorkerInstance } from "../workers/types";
import { consultScheduler } from "./scheduler-adapter";
import { selectReadyTask } from "./queue-adapter";
import type { TaskDispatchResult } from "./types";

export function dispatchTask(
  scheduler: RuntimeScheduler,
  queue: RuntimeTaskQueue,
  workers: WorkerInstance[],
  ventureId: string,
  preferredWorkerId?: string,
): TaskDispatchResult {
  consultScheduler(scheduler, queue, workers, ventureId);

  const task = selectReadyTask(queue, ventureId, preferredWorkerId);
  if (!task) {
    return { task: null, reason: "No READY tasks in queue" };
  }

  return { task, reason: `Selected task ${task.id} (${task.type})` };
}
