/** ForgeOS Worker Runtime — execution context (Epic 4.3). */

import type { RuntimeEventBus } from "../event-bus/types";
import type { RuntimeScheduler } from "../scheduler/types";
import type { VentureStateMachine } from "../state-machine/types";
import type { WorkerRegistry } from "./types";
import type { WorkerTelemetryStore } from "./telemetry";

export interface WorkerRuntimeContext {
  registry: WorkerRegistry;
  eventBus: RuntimeEventBus;
  scheduler: RuntimeScheduler;
  stateMachine: VentureStateMachine;
  telemetry: WorkerTelemetryStore;
  ventureId: string;
  triggeredBy: string;
}

export function createWorkerContext(
  partial: Omit<WorkerRuntimeContext, "triggeredBy"> & { triggeredBy?: string },
): WorkerRuntimeContext {
  return {
    ...partial,
    triggeredBy: partial.triggeredBy ?? "worker-runtime",
  };
}
