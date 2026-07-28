import type { VentureProject } from "@/lib/domain/venture";
import { computeAttention, enrichMetricsWithAttention } from "../attention-engine";
import { contextsToFosContexts } from "../context-engine";
import { resolvePrimaryDecision } from "../decision-engine";
import { createEventBus, getSharedEventBus, type FosEventBus } from "../event-bus";
import { resolveAllLifecycleStates } from "../lifecycle-engine";
import { writeFosMemory } from "../memory";
import { computePortfolioMetrics } from "../portfolio-engine";
import { resolveTopPriority } from "../priority-engine";
import { getScheduledPipeline } from "../scheduler";
import { coordinateWorkers } from "../worker-coordinator";
import type { FosEvent, FosRunInput, FosRunResult, FosSnapshot } from "../types";

export interface FosKernel {
  run(input: FosRunInput): FosRunResult;
  getLastSnapshot(): FosSnapshot | null;
  getEventBus(): FosEventBus;
}

export function createFosKernel(bus?: FosEventBus): FosKernel {
  const eventBus = bus ?? createEventBus();
  let lastSnapshot: FosSnapshot | null = null;

  function emit<T>(type: FosEvent<T>["type"], source: FosEvent<T>["source"], payload: T): void {
    eventBus.publish({
      type,
      timestamp: new Date().toISOString(),
      source,
      payload,
    });
  }

  function run(input: FosRunInput): FosRunResult {
    const { ventures } = input;
    const sorted = [...ventures].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    emit("fos:boot", "kernel", { ventureCount: sorted.length });

    const pipeline = getScheduledPipeline();
    void pipeline;

    const baseMetrics = computePortfolioMetrics(sorted);
    const attention = computeAttention(sorted);
    const metrics = enrichMetricsWithAttention(baseMetrics, attention);
    const ventureContexts = contextsToFosContexts(sorted);
    const priority = resolveTopPriority(sorted);
    const decision = resolvePrimaryDecision(sorted);
    const lifecycle = resolveAllLifecycleStates(sorted);
    const workers = coordinateWorkers(sorted);

    emit("fos:context:built", "context-engine", { count: ventureContexts.length });
    emit("fos:lifecycle:transition", "lifecycle-engine", { states: lifecycle });
    emit("fos:metrics:computed", "portfolio-engine", metrics);
    emit("fos:portfolio:updated", "portfolio-engine", { ventureCount: sorted.length });
    emit("fos:priority:resolved", "priority-engine", priority);
    emit("fos:attention:shifted", "attention-engine", attention);
    emit("fos:health:assessed", "portfolio-engine", {
      health: metrics.portfolioHealth,
      risk: metrics.risk,
    });
    emit("fos:decision:made", "decision-engine", decision);
    emit("fos:live:activity", "worker-coordinator", { workers });

    const snapshot: FosSnapshot = {
      metrics,
      ventureContexts,
      topPriorityVentureId: priority.ventureId,
      computedAt: new Date().toISOString(),
    };

    writeFosMemory(metrics, ventureContexts);
    lastSnapshot = snapshot;

    return {
      ...snapshot,
      events: eventBus.getHistory(),
    };
  }

  return {
    run,
    getLastSnapshot: () => lastSnapshot,
    getEventBus: () => eventBus,
  };
}

let defaultKernel: FosKernel | null = null;

export function getFosKernel(): FosKernel {
  if (!defaultKernel) defaultKernel = createFosKernel(getSharedEventBus());
  return defaultKernel;
}

export function runFos(ventures: VentureProject[]): FosRunResult {
  return getFosKernel().run({ ventures });
}
