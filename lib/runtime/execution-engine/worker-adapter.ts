/** ForgeOS Execution Engine — Worker adapter (Epic 4.5). */

import { createWorkerContext } from "../workers/worker-context";
import { createWorkerRunner } from "../workers/worker-runner";
import { createWorkerTelemetryStore } from "../workers/telemetry";
import type { WorkerRegistry, WorkerTaskRequest, WorkerTaskResult } from "../workers/types";
import type { RuntimeEventBus } from "../event-bus/types";
import type { RuntimeScheduler } from "../scheduler/types";
import type { VentureStateMachine } from "../state-machine/types";
import type { VentureState } from "../state-machine/types";
import { getVentureState } from "../workers/state-machine-adapter";

export function createExecutionWorkerRunner(deps: {
  registry: WorkerRegistry;
  eventBus: RuntimeEventBus;
  scheduler: RuntimeScheduler;
  stateMachine: VentureStateMachine;
  ventureId: string;
  triggeredBy: string;
}) {
  const telemetry = createWorkerTelemetryStore();
  const ctx = createWorkerContext({
    registry: deps.registry,
    eventBus: deps.eventBus,
    scheduler: deps.scheduler,
    stateMachine: deps.stateMachine,
    telemetry,
    ventureId: deps.ventureId,
    triggeredBy: deps.triggeredBy,
  });
  return { runner: createWorkerRunner(ctx), telemetry };
}

export function executeWorkerTask(
  deps: {
    registry: WorkerRegistry;
    eventBus: RuntimeEventBus;
    scheduler: RuntimeScheduler;
    stateMachine: VentureStateMachine;
    ventureId: string;
    triggeredBy: string;
  },
  request: WorkerTaskRequest,
): WorkerTaskResult {
  const { runner } = createExecutionWorkerRunner(deps);
  return runner.run(request);
}

export function resolveVentureStateForExecution(
  stateMachine: VentureStateMachine,
  ventureId: string,
  fallback: VentureState = "RESEARCH",
): VentureState {
  const state = getVentureState(stateMachine, ventureId);
  return state === "IDEA" ? fallback : state;
}
