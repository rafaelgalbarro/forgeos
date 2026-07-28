import { getSharedEventBus } from "@/lib/fos";
import type { WorkerAssignment } from "@/lib/fos/worker-coordinator";

interface LiveWorkerPayload {
  workers: WorkerAssignment[];
}

let lastWorkers: WorkerAssignment[] = [];
let initialized = false;

export function initLiveFosBridge(): void {
  if (initialized) return;
  initialized = true;

  const bus = getSharedEventBus();
  bus.subscribe<LiveWorkerPayload>("fos:live:activity", (event) => {
    lastWorkers = event.payload.workers;
  });
}

export function getFosWorkerActivity(): WorkerAssignment[] {
  initLiveFosBridge();
  return lastWorkers;
}
