/** Component health probes (Epic 4.6). */

import { listConfiguredProviders } from "@/lib/ai-gateway/registry";
import { getExecutiveObservations } from "@/lib/ai-orchestration/observability";
import { getExecutiveGraphForVenture } from "@/lib/ai-orchestration/decision-graph-writer";
import { getExecutiveRuntimeMemory } from "@/lib/ai-orchestration/executive-memory-writer";
import { TASK_REGISTRY } from "@/lib/ai-orchestration/task-registry";
import type { RuntimeEventBus } from "../event-bus/types";
import type { RuntimeScheduler } from "../scheduler/types";
import type { RuntimeTaskQueue } from "../task-queue/types";
import type { WorkerRegistry } from "../workers/types";
import { computeWorkerMetrics } from "../workers/metrics";
import type {
  ComponentHealthReport,
  RuntimeComponentId,
  RuntimeHealthLevel,
  RuntimeObservabilityContext,
} from "./types";

const EXECUTION_ENGINE_MODULE_AVAILABLE = true;

export const EXECUTION_ENGINE_DEPENDENCY_NOTE =
  "Wire executionEngine in RuntimeObservabilityContext for live probes. Epic 4.5 module is available at lib/runtime/execution-engine/.";

export function isExecutionEngineModuleAvailable(): boolean {
  return EXECUTION_ENGINE_MODULE_AVAILABLE;
}

function worstLevel(levels: RuntimeHealthLevel[]): RuntimeHealthLevel {
  const order: RuntimeHealthLevel[] = [
    "OFFLINE",
    "CRITICAL",
    "DEGRADED",
    "WARNING",
    "HEALTHY",
  ];
  for (const level of order) {
    if (levels.includes(level)) return level;
  }
  return "HEALTHY";
}

export function probeEventBusHealth(
  bus: Pick<RuntimeEventBus, "getHistory">,
): ComponentHealthReport {
  const history = bus.getHistory(500);
  const checkedAt = new Date().toISOString();

  if (history.length === 0) {
    return {
      component: "event-bus",
      level: "WARNING",
      message: "No events recorded — bus idle or disconnected",
      checkedAt,
      details: { eventCount: 0 },
    };
  }

  const recent = history.slice(-20);
  const ageMs = Date.now() - new Date(recent[recent.length - 1]!.timestamp).getTime();
  const level: RuntimeHealthLevel = ageMs > 300_000 ? "WARNING" : "HEALTHY";

  return {
    component: "event-bus",
    level,
    message: `${history.length} events in history`,
    checkedAt,
    details: { eventCount: history.length, lastEventAgeMs: ageMs },
  };
}

export function probeSchedulerHealth(
  scheduler: Pick<RuntimeScheduler, "getSnapshot">,
  ventureId?: string,
): ComponentHealthReport {
  const snapshot = scheduler.getSnapshot(ventureId);
  const checkedAt = new Date().toISOString();
  const blocked = snapshot.taskCountByStatus.blocked ?? 0;
  const failed = snapshot.taskCountByStatus.failed ?? 0;
  const total = snapshot.tasks.length;

  let level: RuntimeHealthLevel = "HEALTHY";
  let message = `${total} scheduler tasks tracked`;

  if (total === 0) {
    level = "WARNING";
    message = "Scheduler has no tasks — may be stopped or not receiving events";
  } else if (failed > 0) {
    level = "DEGRADED";
    message = `${failed} failed scheduler task(s)`;
  } else if (blocked > total * 0.5) {
    level = "WARNING";
    message = `${blocked} blocked scheduler tasks`;
  }

  return {
    component: "scheduler",
    level,
    message,
    checkedAt,
    details: {
      taskCount: total,
      byStatus: snapshot.taskCountByStatus,
      readyCount: snapshot.plan?.readyTaskIds.length ?? 0,
    },
  };
}

export function probeTaskQueueHealth(
  queue: RuntimeTaskQueue,
  ventureId?: string,
  saturationThreshold = 50,
): ComponentHealthReport {
  const snapshot = queue.getSnapshot(ventureId);
  const checkedAt = new Date().toISOString();
  const m = snapshot.metrics;
  const depth = m.ready + m.running + m.blocked + m.waiting + m.retrying;

  let level: RuntimeHealthLevel = "HEALTHY";
  let message = `${depth} active queue items`;

  if (m.deadLetter > 5) {
    level = "DEGRADED";
    message = `${m.deadLetter} dead-letter tasks`;
  } else if (m.blocked > 10) {
    level = "WARNING";
    message = `${m.blocked} blocked queue tasks`;
  } else if (depth >= saturationThreshold) {
    level = "WARNING";
    message = `Queue depth ${depth} approaching saturation`;
  } else if (m.failed > 0) {
    level = "WARNING";
    message = `${m.failed} failed tasks in queue`;
  }

  return {
    component: "task-queue",
    level,
    message,
    checkedAt,
    details: { depth, metrics: m },
  };
}

export function probeWorkerRuntimeHealth(
  registry: WorkerRegistry,
): ComponentHealthReport {
  const workers = registry.list();
  const metrics = computeWorkerMetrics(workers);
  const checkedAt = new Date().toISOString();

  const offline = metrics.byHealth.OFFLINE + metrics.byStatus.OFFLINE;
  const critical = metrics.byHealth.CRITICAL;
  const degraded = metrics.byHealth.DEGRADED;

  let level: RuntimeHealthLevel = "HEALTHY";
  let message = `${workers.length} workers registered`;

  if (workers.length === 0) {
    level = "CRITICAL";
    message = "No workers registered";
  } else if (offline > 0) {
    level = offline === workers.length ? "OFFLINE" : "CRITICAL";
    message = `${offline} worker(s) offline`;
  } else if (critical > 0) {
    level = "CRITICAL";
    message = `${critical} worker(s) in critical health`;
  } else if (degraded > 0) {
    level = "DEGRADED";
    message = `${degraded} worker(s) degraded`;
  } else if (metrics.byHealth.WARNING > 0) {
    level = "WARNING";
    message = `${metrics.byHealth.WARNING} worker(s) with warnings`;
  }

  return {
    component: "worker-runtime",
    level,
    message,
    checkedAt,
    details: { metrics, workerCount: workers.length },
  };
}

export function probeExecutionEngineHealth(
  ctx?: Pick<RuntimeObservabilityContext, "executionEngine" | "ventureId" | "queue">,
): ComponentHealthReport {
  const checkedAt = new Date().toISOString();

  if (!ctx?.executionEngine) {
    const running = ctx?.queue?.getSnapshot(ctx.ventureId).metrics.running ?? 0;
    return {
      component: "execution-engine",
      level: running > 0 ? "WARNING" : "OFFLINE",
      message:
        running > 0
          ? `${running} task(s) running without execution engine wired to observability`
          : EXECUTION_ENGINE_DEPENDENCY_NOTE,
      checkedAt,
      details: { wired: false, runningTasks: running },
    };
  }

  const sessions = ctx.executionEngine.getSessions(ctx.ventureId);
  const active = ctx.executionEngine.getActiveSessions();
  const failed = sessions.filter((s) => s.status === "FAILED").length;
  const deadLetter = sessions.filter((s) => s.status === "DEAD_LETTER").length;

  let level: RuntimeHealthLevel = "HEALTHY";
  let message = `${sessions.length} execution session(s)`;

  if (active.length > 5) {
    level = "WARNING";
    message = `${active.length} active execution sessions`;
  } else if (deadLetter > 0) {
    level = "DEGRADED";
    message = `${deadLetter} dead-letter execution session(s)`;
  } else if (failed > 0) {
    level = "WARNING";
    message = `${failed} failed execution session(s)`;
  } else if (sessions.length === 0) {
    level = "WARNING";
    message = "Execution engine idle — no sessions recorded";
  }

  return {
    component: "execution-engine",
    level,
    message,
    checkedAt,
    details: {
      wired: true,
      totalSessions: sessions.length,
      activeSessions: active.length,
      failed,
      deadLetter,
    },
  };
}

export function probeMemoryHealth(ventureId: string): ComponentHealthReport {
  const checkedAt = new Date().toISOString();
  const memory = getExecutiveRuntimeMemory();
  const ventureRecords =
    memory.ceoReviews.filter((r) => r.ventureId === ventureId).length +
    memory.boardReviews.filter((r) => r.ventureId === ventureId).length +
    memory.executiveDecisions.filter((r) => r.ventureId === ventureId).length;

  let level: RuntimeHealthLevel = ventureRecords > 0 ? "HEALTHY" : "WARNING";
  let message =
    ventureRecords > 0
      ? `${ventureRecords} executive memory records for venture`
      : "No executive memory records for venture";

  const globalCount =
    memory.ceoReviews.length +
    memory.boardReviews.length +
    memory.executiveDecisions.length;

  if (globalCount > 0 && ventureRecords === 0) {
    level = "WARNING";
    message = "Global memory exists but no venture-scoped records";
  }

  return {
    component: "memory",
    level,
    message,
    checkedAt,
    details: { ventureRecords, globalCount },
  };
}

export function probeDecisionGraphHealth(ventureId: string): ComponentHealthReport {
  const checkedAt = new Date().toISOString();
  const nodes = getExecutiveGraphForVenture(ventureId);

  let level: RuntimeHealthLevel = nodes.length > 0 ? "HEALTHY" : "WARNING";
  let message =
    nodes.length > 0
      ? `${nodes.length} decision graph node(s)`
      : "Decision graph empty for venture";

  const orphanDeps = nodes.filter(
    (n) =>
      n.dependencies?.some((dep) => !nodes.find((other) => other.id === dep)) ?? false,
  );

  if (orphanDeps.length > 0) {
    level = "DEGRADED";
    message = `${orphanDeps.length} node(s) with broken dependency references`;
  }

  return {
    component: "decision-graph",
    level,
    message,
    checkedAt,
    details: { nodeCount: nodes.length, orphanDeps: orphanDeps.length },
  };
}

export function probeAiGatewayHealth(): ComponentHealthReport {
  const checkedAt = new Date().toISOString();
  const configured = listConfiguredProviders();

  let level: RuntimeHealthLevel;
  let message: string;

  if (configured.length === 0) {
    level = "WARNING";
    message = "No AI providers configured — using mocks/heuristics";
  } else if (configured.length === 1) {
    level = "WARNING";
    message = `Single provider configured (${configured[0]}) — no fallback redundancy`;
  } else {
    level = "HEALTHY";
    message = `${configured.length} AI providers configured`;
  }

  return {
    component: "ai-gateway",
    level,
    message,
    checkedAt,
    details: { configuredProviders: configured },
  };
}

export function probeAiOrchestrationHealth(
  ventureId: string,
  slowLatencyMs = 10_000,
): ComponentHealthReport {
  const checkedAt = new Date().toISOString();
  const taskCount = Object.keys(TASK_REGISTRY).length;
  const observations = getExecutiveObservations(ventureId);
  const recent = observations.slice(0, 10);

  let level: RuntimeHealthLevel = "HEALTHY";
  let message = `${taskCount} orchestration tasks registered`;

  const slowCalls = recent.filter((o) => o.latencyMs > slowLatencyMs);
  const fallbackCalls = recent.filter((o) => o.fallbackUsed);

  if (slowCalls.length > 0) {
    level = "DEGRADED";
    message = `${slowCalls.length} slow AI call(s) detected`;
  } else if (fallbackCalls.length > recent.length / 2 && recent.length > 0) {
    level = "WARNING";
    message = "High fallback rate in recent orchestration calls";
  } else if (taskCount === 0) {
    level = "CRITICAL";
    message = "Orchestration task registry empty";
  }

  return {
    component: "ai-orchestration",
    level,
    message,
    checkedAt,
    details: {
      taskCount,
      recentObservations: recent.length,
      slowCalls: slowCalls.length,
      fallbackCalls: fallbackCalls.length,
    },
  };
}

export function probeAllComponentHealth(
  ctx: RuntimeObservabilityContext,
  options?: { queueSaturationThreshold?: number; aiSlowLatencyMs?: number },
): ComponentHealthReport[] {
  return [
    probeEventBusHealth(ctx.eventBus),
    probeSchedulerHealth(ctx.scheduler, ctx.ventureId),
    probeTaskQueueHealth(ctx.queue, ctx.ventureId, options?.queueSaturationThreshold),
    probeWorkerRuntimeHealth(ctx.workers),
    probeExecutionEngineHealth(ctx),
    probeMemoryHealth(ctx.ventureId),
    probeDecisionGraphHealth(ctx.ventureId),
    probeAiGatewayHealth(),
    probeAiOrchestrationHealth(ctx.ventureId, options?.aiSlowLatencyMs),
  ];
}

export function computeOverallHealth(components: ComponentHealthReport[]): RuntimeHealthLevel {
  return worstLevel(components.map((c) => c.level));
}

export function isExecutionEngineAvailable(
  ctx?: Pick<RuntimeObservabilityContext, "executionEngine">,
): boolean {
  return Boolean(ctx?.executionEngine);
}
