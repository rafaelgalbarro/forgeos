/** ForgeOS Execution Engine — runtime context assembly (Epic 4.5). */

import { createRuntimeEventBus } from "../event-bus/event-bus";
import {
  connectSchedulerToEventBus,
  createRuntimeScheduler,
} from "../scheduler/scheduler";
import { createVentureStateMachine } from "../state-machine/state-machine";
import { createRuntimeTaskQueue } from "../task-queue/task-queue";
import { createWorkerRegistry } from "../workers/worker-registry";
import { registerOfficialWorkers } from "../workers/worker-factory";
import { createWorkerTelemetryStore } from "../workers/telemetry";
import { ExecutionStore } from "./execution-store";
import { ExecutionHistoryStore } from "./execution-history";
import { ExecutionTelemetryStore } from "./execution-telemetry";
import { createAiOrchestrationAdapter } from "./ai-orchestration-adapter";
import type { ExecutionEngineContext } from "./types";

export interface CreateExecutionContextOptions {
  triggeredBy?: string;
  ventureId?: string;
}

export function createExecutionContext(
  options: CreateExecutionContextOptions = {},
): ExecutionEngineContext {
  const eventBus = createRuntimeEventBus();
  const scheduler = connectSchedulerToEventBus(createRuntimeScheduler(), eventBus);
  const queue = createRuntimeTaskQueue();
  const registry = createWorkerRegistry();
  registerOfficialWorkers(registry);
  const stateMachine = createVentureStateMachine();
  const store = new ExecutionStore();
  const history = new ExecutionHistoryStore();
  const telemetry = new ExecutionTelemetryStore();
  const aiOrchestration = createAiOrchestrationAdapter();

  return {
    eventBus,
    scheduler,
    queue,
    registry,
    stateMachine,
    store,
    history,
    telemetry,
    aiOrchestration,
    triggeredBy: options.triggeredBy ?? "execution-engine",
  };
}

export function createWorkerRuntimeDeps(ctx: ExecutionEngineContext) {
  return {
    registry: ctx.registry,
    eventBus: ctx.eventBus,
    scheduler: ctx.scheduler,
    stateMachine: ctx.stateMachine,
    telemetry: createWorkerTelemetryStore(),
    ventureId: "",
    triggeredBy: ctx.triggeredBy,
  };
}
