/** Lab harness for Execution Engine (Epic 4.5) — isolated from production routes. */

import type { RuntimeEvent } from "@/lib/runtime/event-bus/types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { publishWorkerRegistered } from "@/lib/runtime/workers/eventbus-adapter";
import {
  planSchedulerTasksIntoQueue,
  publishTaskCreated,
  publishTaskStatusChange,
  type QueueSnapshot,
  type QueueTaskPriority,
} from "@/lib/runtime/task-queue";
import type { VentureState } from "@/lib/runtime/state-machine/types";
import type { ConnectedRuntimeScheduler } from "@/lib/runtime/scheduler/scheduler";
import {
  createExecutionContext,
  createExecutionEngine,
  computeExecutionMetrics,
  getExecutionEvents,
  getExecutionMemoryWrites,
  getExecutionDecisionWrites,
  type ExecutionResult,
  type ExecutionSession,
  type ExecutionMetrics,
  type FutureAdapterStub,
} from "@/lib/runtime/execution-engine";

export interface ExecutionEngineLabSession {
  ventureId: string;
  runMockRuntime(): ExecutionResult[];
  getSessions(): ExecutionSession[];
  getLatestSession(): ExecutionSession | null;
  getQueueSnapshot(): QueueSnapshot;
  getExecutionEvents(): RuntimeEvent[];
  getMemoryWrites(): ReturnType<typeof getExecutionMemoryWrites>;
  getDecisionWrites(): ReturnType<typeof getExecutionDecisionWrites>;
  getMetrics(): ExecutionMetrics;
  getVentureState(): VentureState;
  setVentureState(state: VentureState): void;
  getFutureAdapters(): FutureAdapterStub[];
  reset(): void;
}

const MOCK_PIPELINE: Array<{
  type: import("@/lib/runtime/task-queue").QueueTask["type"];
  priority: QueueTaskPriority;
  label: string;
}> = [
  { type: "DISCOVERY_REVIEW", priority: "P1_HIGH", label: "Discovery review" },
  { type: "RESEARCH_RUN", priority: "P1_HIGH", label: "Research run" },
  { type: "PRODUCT_UPDATE", priority: "P2_MEDIUM", label: "Product update" },
  { type: "BUILD_PLAN_UPDATE", priority: "P2_MEDIUM", label: "Build plan update" },
  { type: "BUILD", priority: "P1_HIGH", label: "Build" },
  { type: "QA", priority: "P2_MEDIUM", label: "QA" },
  { type: "LAUNCH", priority: "P0_CRITICAL", label: "Launch" },
  { type: "RISK_REVIEW", priority: "P0_CRITICAL", label: "Risk review" },
  { type: "MEMORY_WRITE", priority: "P3_LOW", label: "Memory write" },
];

function seedSchedulerEvents(
  bus: ReturnType<typeof createExecutionContext>["eventBus"],
  ventureId: string,
): void {
  const events = [
    { type: "VENTURE_CREATED" as const, payload: { ventureId, name: "FleetPulse Lab" } },
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
      type: "BOARD_CONSENSUS_REACHED" as const,
      payload: {
        ventureId,
        consensusId: `con_${Date.now()}`,
        level: "majority",
        finalDecision: "proceed",
        confidence: 0.85,
      },
    },
    {
      type: "RISK_DETECTED" as const,
      payload: {
        ventureId,
        riskId: `risk_${Date.now()}`,
        severity: "critical" as const,
        title: "Compliance gap",
      },
    },
  ];

  for (const evt of events) {
    bus.publish({ type: evt.type, source: "execution-engine-lab", payload: evt.payload });
  }
}

function seedQueue(
  ctx: ReturnType<typeof createExecutionContext>,
  ventureId: string,
): void {
  const { scheduler, queue, registry, eventBus } = ctx;
  const workers = registry.list();
  planSchedulerTasksIntoQueue(scheduler, queue, workers, ventureId);

  for (const spec of MOCK_PIPELINE) {
    const existing = queue.getTasks({ ventureId, type: spec.type });
    if (existing.length > 0) continue;
    const task = queue.enqueue({
      type: spec.type,
      ventureId,
      priority: spec.priority,
      label: spec.label,
      retryPolicy: spec.priority === "P0_CRITICAL" ? "MAX_5" : "MAX_3",
    });
    publishTaskCreated(eventBus, "execution-engine-lab", task);
    if (task.status === "READY") {
      publishTaskStatusChange(eventBus, "execution-engine-lab", task);
    }
  }

  for (const t of queue.getTasks({ ventureId, type: "PRODUCT_UPDATE" })) {
    if (t.status !== "COMPLETED") {
      queue.updateStatus(t.id, "COMPLETED", { reason: "Mock product complete for lab" });
    }
  }
}

function initVentureState(
  ctx: ReturnType<typeof createExecutionContext>,
  ventureId: string,
): void {
  try {
    ctx.stateMachine.transition({
      ventureId,
      to: "RESEARCH",
      reason: "Lab initialization",
      triggeredBy: "execution-engine-lab",
      context: {
        ventureId,
        discoveryComplete: true,
        researchComplete: false,
        hasProductPrd: false,
        qaComplete: false,
        hasMinimumMetrics: false,
        blockResolved: true,
      },
    });
  } catch {
    // Venture may already exist in state machine
  }
}

export function createExecutionEngineLab(
  ventureId = LAB_MOCK_VENTURE_ID,
): ExecutionEngineLabSession {
  const ctx = createExecutionContext({ triggeredBy: "execution-engine-lab" });
  const engine = createExecutionEngine(ctx, { maxSessionsPerRun: 12 });

  for (const worker of ctx.registry.list()) {
    publishWorkerRegistered(ctx.eventBus, "execution-engine-lab", {
      workerId: worker.id,
      name: worker.name,
      department: worker.department,
      version: worker.version,
      ventureId,
    });
  }

  seedSchedulerEvents(ctx.eventBus, ventureId);
  initVentureState(ctx, ventureId);

  return {
    ventureId,

    runMockRuntime(): ExecutionResult[] {
      seedQueue(ctx, ventureId);
      return engine.runBatch(ventureId, 8);
    },

    getSessions() {
      return engine.getSessions(ventureId);
    },

    getLatestSession() {
      const sessions = engine.getSessions(ventureId);
      return sessions[0] ?? null;
    },

    getQueueSnapshot() {
      return ctx.queue.getSnapshot(ventureId);
    },

    getExecutionEvents() {
      return getExecutionEvents(ctx.eventBus, 40);
    },

    getMemoryWrites() {
      return getExecutionMemoryWrites(ventureId, 30);
    },

    getDecisionWrites() {
      return getExecutionDecisionWrites(ventureId, 30);
    },

    getMetrics() {
      return computeExecutionMetrics(
        engine.getSessions(ventureId),
        ctx.history,
        ctx.telemetry.summarize(),
      );
    },

    getVentureState() {
      return ctx.stateMachine.getState(ventureId);
    },

    setVentureState(state: VentureState) {
      try {
        ctx.stateMachine.transition({
          ventureId,
          to: state,
          reason: "Lab state override",
          triggeredBy: "execution-engine-lab",
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
        // Lab may set states out of linear order
      }
    },

    getFutureAdapters() {
      return ctx.aiOrchestration.listFutureAdapters();
    },

    reset() {
      engine.clear();
      (ctx.scheduler as ConnectedRuntimeScheduler).disconnect();
      ctx.scheduler.clear();
      ctx.queue.clear();
      ctx.stateMachine.clear();
      ctx.registry.clear();
      ctx.eventBus.clear();
    },
  };
}
