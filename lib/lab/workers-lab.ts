/** Lab harness for Worker Runtime (Epic 4.3) — isolated from production routes. */

import { createRuntimeEventBus } from "@/lib/runtime/event-bus/event-bus";
import type { RuntimeEvent } from "@/lib/runtime/event-bus/types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  connectSchedulerToEventBus,
  createRuntimeScheduler,
} from "@/lib/runtime/scheduler/scheduler";
import { createVentureStateMachine } from "@/lib/runtime/state-machine/state-machine";
import { createWorkerRegistry } from "@/lib/runtime/workers/worker-registry";
import { registerOfficialWorkers } from "@/lib/runtime/workers/worker-factory";
import { createWorkerContext } from "@/lib/runtime/workers/worker-context";
import { createWorkerRunner, clearRunnerHealthMetrics } from "@/lib/runtime/workers/worker-runner";
import { createWorkerTelemetryStore } from "@/lib/runtime/workers/telemetry";
import { computeWorkerMetrics } from "@/lib/runtime/workers/metrics";
import { publishWorkerRegistered } from "@/lib/runtime/workers/eventbus-adapter";
import { getStatusTransitionHistory, clearStatusTransitionHistory } from "@/lib/runtime/workers/worker-status";
import type { WorkerInstance, WorkerTaskRequest, WorkerTaskResult } from "@/lib/runtime/workers/types";
import type { WorkerRuntimeMetrics } from "@/lib/runtime/workers/metrics";
import type { WorkerTelemetryRecord } from "@/lib/runtime/workers/telemetry";
import type { VentureState } from "@/lib/runtime/state-machine/types";
import type { WorkerStatusTransition } from "@/lib/runtime/workers/worker-status";

export interface WorkersLabSession {
  ventureId: string;
  ventureState: VentureState;
  getWorkers(): WorkerInstance[];
  getMetrics(): WorkerRuntimeMetrics;
  getTelemetry(): WorkerTelemetryRecord[];
  getWorkerEvents(): RuntimeEvent[];
  getStatusTransitions(): WorkerStatusTransition[];
  setVentureState(state: VentureState): void;
  runMockTask(workerId: string, taskType?: string): WorkerTaskResult;
  runMockDemo(): WorkerTaskResult[];
  reset(): void;
}

export function createWorkersLab(ventureId = LAB_MOCK_VENTURE_ID): WorkersLabSession {
  const bus = createRuntimeEventBus();
  const scheduler = connectSchedulerToEventBus(createRuntimeScheduler(), bus);
  const stateMachine = createVentureStateMachine();
  const registry = createWorkerRegistry();
  registerOfficialWorkers(registry);

  for (const worker of registry.list()) {
    publishWorkerRegistered(bus, "workers-lab", {
      workerId: worker.id,
      name: worker.name,
      department: worker.department,
      version: worker.version,
      ventureId,
    });
  }

  let ventureState: VentureState = "RESEARCH";

  const telemetry = createWorkerTelemetryStore();
  const ctx = createWorkerContext({
    registry,
    eventBus: bus,
    scheduler,
    stateMachine,
    telemetry,
    ventureId,
    triggeredBy: "workers-lab",
  });

  const runner = createWorkerRunner(ctx);

  bus.publish({
    type: "VENTURE_CREATED",
    source: "workers-lab",
    payload: { ventureId, name: "FleetPulse Lab" },
  });
  bus.publish({
    type: "DISCOVERY_COMPLETED",
    source: "workers-lab",
    payload: { ventureId, stage: "discovery", summary: "Lab discovery complete" },
  });

  return {
    ventureId,
    ventureState,

    getWorkers() {
      return registry.list();
    },

    getMetrics() {
      return computeWorkerMetrics(registry.list());
    },

    getTelemetry() {
      return telemetry.list(50);
    },

    getWorkerEvents() {
      return bus
        .getHistoryByCategory("worker", 50)
        .reverse();
    },

    getStatusTransitions() {
      return getStatusTransitionHistory(50);
    },

    setVentureState(state: VentureState) {
      ventureState = state;
      try {
        stateMachine.transition({
          ventureId,
          to: state,
          reason: "Lab state override",
          triggeredBy: "workers-lab",
          context: {
            ventureId,
            discoveryComplete: true,
            researchComplete: true,
            hasProductPrd: true,
            qaComplete: state === "QA" || state === "LAUNCH",
            hasMinimumMetrics: true,
            blockResolved: true,
          },
        });
      } catch {
        // Lab may set states out of linear order — local ventureState still drives runner validation.
      }
    },

    runMockTask(workerId: string, taskType?: string) {
      const worker = registry.find(workerId);
      if (!worker) {
        return {
          success: false,
          workerId,
          taskType: taskType ?? "UNKNOWN",
          ventureId,
          taskId: `fail_${Date.now()}`,
          status: "FAILED" as const,
          durationMs: 0,
          output: {},
          errors: [`Worker not found: ${workerId}`],
          warnings: [],
          mock: true as const,
        };
      }
      const task = taskType ?? worker.supportedTasks[0];
      const request: WorkerTaskRequest = {
        workerId,
        taskType: task,
        ventureId,
        ventureState,
      };
      return runner.run(request);
    },

    runMockDemo() {
      const steps: Array<{ state: VentureState; workerId: string; taskType: string }> = [
        { state: "RESEARCH", workerId: "research", taskType: "RESEARCH_RUN" },
        { state: "PRODUCT", workerId: "product", taskType: "UPDATE_PRD" },
        { state: "UX", workerId: "ux", taskType: "GENERATE_FLOWS" },
        { state: "BUILD", workerId: "backend", taskType: "API_IMPLEMENTATION" },
        { state: "QA", workerId: "qa", taskType: "GENERATE_TEST_PLAN" },
      ];
      const results: WorkerTaskResult[] = [];
      for (const step of steps) {
        this.setVentureState(step.state);
        results.push(this.runMockTask(step.workerId, step.taskType));
      }
      return results;
    },

    reset() {
      scheduler.disconnect();
      scheduler.clear();
      stateMachine.clear();
      registry.clear();
      telemetry.clear();
      bus.clear();
      clearRunnerHealthMetrics();
      clearStatusTransitionHistory();
    },
  };
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  executive: "Executive",
  research: "Research",
  product: "Product",
  design: "Design",
  engineering: "Engineering",
  quality: "Quality",
  growth: "Growth",
  finance: "Finance",
  legal: "Legal",
  operations: "Operations",
  capital: "Capital",
  knowledge: "Knowledge",
  analytics: "Analytics",
  build: "Build",
  deployment: "Deployment",
};
