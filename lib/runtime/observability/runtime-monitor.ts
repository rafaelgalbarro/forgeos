/** Runtime monitor — main observability orchestrator (Epic 4.6). */

import { type ConnectedRuntimeScheduler } from "../scheduler/scheduler";
import { registerOfficialWorkers } from "../workers/worker-factory";
import { createExecutionContext } from "../execution-engine/execution-context";
import { createExecutionEngine } from "../execution-engine/execution-engine";
import type { ExecutionEngine } from "../execution-engine/types";
import { planSchedulerTasksIntoQueue } from "../task-queue/scheduler-adapter";
import { publishTaskCreated } from "../task-queue/eventbus-adapter";
import { buildRuntimeDashboard } from "./runtime-dashboard";
import { profileSync } from "./runtime-profiler";
import { buildPipelineTrace, storeTrace } from "./runtime-traces";
import { recordRuntimeError } from "./runtime-errors";
import {
  createObservabilityStore,
  type ObservabilityStore,
} from "./runtime-store";
import type {
  RuntimeDashboardSnapshot,
  RuntimeMonitorOptions,
  RuntimeObservabilityContext,
} from "./types";

export interface RuntimeMonitor {
  readonly ventureId: string;
  readonly store: ObservabilityStore;
  getContext(): RuntimeObservabilityContext;
  refresh(): RuntimeDashboardSnapshot;
  seedDemoPipeline(): RuntimeDashboardSnapshot;
  clear(): void;
}

export function createRuntimeMonitor(
  ventureId: string,
  options: RuntimeMonitorOptions = {},
): RuntimeMonitor {
  const store = createObservabilityStore(options);
  const execCtx = createExecutionContext({ triggeredBy: "runtime-monitor", ventureId });
  const bus = execCtx.eventBus;
  const scheduler: ConnectedRuntimeScheduler = execCtx.scheduler as ConnectedRuntimeScheduler;
  const queue = execCtx.queue;
  const registry = execCtx.registry;
  const engine: ExecutionEngine = createExecutionEngine(execCtx);

  function getContext(): RuntimeObservabilityContext {
    return {
      ventureId,
      eventBus: bus,
      scheduler,
      queue,
      workers: registry,
      executionEngine: engine,
    };
  }

  function seedEvents(): void {
    const events = [
      { type: "VENTURE_CREATED" as const, payload: { ventureId, name: "Observability Lab" } },
      {
        type: "DISCOVERY_COMPLETED" as const,
        payload: { ventureId, stage: "discovery", summary: "Lab discovery" },
      },
      {
        type: "RESEARCH_COMPLETED" as const,
        payload: { ventureId, stage: "research", summary: "Lab research" },
      },
      {
        type: "CEO_DECISION_CREATED" as const,
        payload: {
          ventureId,
          decisionId: `dec_${Date.now()}`,
          title: "Proceed",
          recommendation: "approve",
          confidence: 0.9,
        },
      },
      {
        type: "RISK_DETECTED" as const,
        payload: {
          ventureId,
          riskId: `risk_${Date.now()}`,
          severity: "high" as const,
          title: "Latency spike",
        },
      },
    ];

    for (const evt of events) {
      bus.publish({ type: evt.type, source: "runtime-monitor", payload: evt.payload });
    }
  }

  function seedDemoPipeline(): RuntimeDashboardSnapshot {
    return profileSync(store, "seedDemoPipeline", "scheduler", () => {
      seedEvents();
      const workers = registry.list();
      const planned = planSchedulerTasksIntoQueue(scheduler, queue, workers, ventureId);

      for (const task of planned.slice(0, 5)) {
        publishTaskCreated(bus, "runtime-monitor", task);
      }

      const lastEvent = bus.getHistory(1)[0];
      const schedulerTask = scheduler.getTasks({ ventureId })[0];
      const queueTask = queue.getTasks({ ventureId })[0];
      const worker = workers[0];

      const lastResult = engine.runOnce(ventureId);

      const trace = buildPipelineTrace({
        ventureId,
        eventId: lastEvent?.id ?? "evt_unknown",
        eventType: lastEvent?.type ?? "VENTURE_CREATED",
        schedulerTaskId: schedulerTask?.id,
        queueTaskId: queueTask?.id ?? lastResult?.task?.id,
        workerId: worker?.id ?? lastResult?.worker?.id,
        executionMs: lastResult?.session.duration ?? 120,
        memoryWritten: (lastResult?.session.memoryWrites.length ?? 0) > 0,
        warnings: lastResult?.skipped
          ? [`Execution skipped: ${lastResult.skipReason ?? "unknown"}`]
          : [],
      });
      storeTrace(store, trace, options);

      if (queueTask?.status === "BLOCKED") {
        recordRuntimeError(store, {
          component: "task-queue",
          message: `Demo blocked task: ${queueTask.label}`,
          ventureId,
          taskId: queueTask.id,
          severity: "low",
        }, options);
      }

      return refresh();
    });
  }

  function refresh(): RuntimeDashboardSnapshot {
    return profileSync(store, "refreshDashboard", "event-bus", () =>
      buildRuntimeDashboard(getContext(), store, options),
    );
  }

  function clear(): void {
    scheduler.disconnect();
    scheduler.clear();
    queue.clear();
    bus.clear();
    registry.clear();
    engine.clear();
    store.traces.length = 0;
    store.alerts.length = 0;
    store.errors.length = 0;
    store.history.length = 0;
    store.profilerSamples.length = 0;
    store.startedAt = Date.now();
    registerOfficialWorkers(registry);
  }

  return {
    ventureId,
    store,
    getContext,
    refresh,
    seedDemoPipeline,
    clear,
  };
}
