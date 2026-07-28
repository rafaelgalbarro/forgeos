/** Runtime alert detection (Epic 4.6). */

import { getExecutiveObservations } from "@/lib/ai-orchestration/observability";
import { computeWorkerMetrics } from "../workers/metrics";
import {
  getStoreLimits,
  nextObservabilityId,
  pushBounded,
  type ObservabilityStore,
} from "./runtime-store";
import type { ComponentHealthReport } from "./types";
import { isExecutionEngineAvailable } from "./runtime-health";
import type {
  AlertLevel,
  AlertType,
  HistoryEntry,
  RuntimeAlert,
  RuntimeMonitorOptions,
  RuntimeObservabilityContext,
} from "./types";

function alertLevelForType(type: AlertType, severity: "low" | "medium" | "high"): AlertLevel {
  if (type === "WORKER_OFFLINE" && severity === "high") return "CRITICAL";
  if (type === "QUEUE_SATURATED" && severity === "high") return "CRITICAL";
  if (type === "SCHEDULER_STOPPED") return "ERROR";
  if (type === "EXECUTION_BLOCKED") return "ERROR";
  if (type === "AI_PROVIDER_SLOW") return "WARNING";
  if (type === "MEMORY_INCONSISTENT") return "WARNING";
  return severity === "high" ? "ERROR" : severity === "medium" ? "WARNING" : "INFO";
}

function createAlert(
  type: AlertType,
  message: string,
  component: RuntimeAlert["component"],
  opts?: { ventureId?: string; severity?: "low" | "medium" | "high"; metadata?: Record<string, unknown> },
): RuntimeAlert {
  const severity = opts?.severity ?? "medium";
  return {
    id: nextObservabilityId("alert"),
    type,
    level: alertLevelForType(type, severity),
    message,
    component,
    ventureId: opts?.ventureId,
    timestamp: new Date().toISOString(),
    acknowledged: false,
    metadata: opts?.metadata,
  };
}

export function detectRuntimeAlerts(
  ctx: RuntimeObservabilityContext,
  components: ComponentHealthReport[],
  options: RuntimeMonitorOptions = {},
): RuntimeAlert[] {
  const alerts: RuntimeAlert[] = [];
  const queueSnapshot = ctx.queue.getSnapshot(ctx.ventureId);
  const schedulerSnapshot = ctx.scheduler.getSnapshot(ctx.ventureId);
  const workers = ctx.workers.list();
  const workerMetrics = computeWorkerMetrics(workers);
  const threshold = options.queueSaturationThreshold ?? 50;
  const slowMs = options.aiSlowLatencyMs ?? 10_000;

  const offlineWorkers = workers.filter(
    (w) => w.status === "OFFLINE" || w.health.level === "OFFLINE",
  );
  for (const w of offlineWorkers) {
    alerts.push(
      createAlert("WORKER_OFFLINE", `Worker ${w.name} (${w.id}) is offline`, "worker-runtime", {
        ventureId: ctx.ventureId,
        severity: "high",
        metadata: { workerId: w.id },
      }),
    );
  }

  const depth =
    queueSnapshot.metrics.ready +
    queueSnapshot.metrics.running +
    queueSnapshot.metrics.blocked +
    queueSnapshot.metrics.waiting;

  if (depth >= threshold) {
    alerts.push(
      createAlert(
        "QUEUE_SATURATED",
        `Queue depth ${depth} exceeds threshold ${threshold}`,
        "task-queue",
        { ventureId: ctx.ventureId, severity: depth >= threshold * 1.5 ? "high" : "medium", metadata: { depth } },
      ),
    );
  }

  if (schedulerSnapshot.tasks.length === 0) {
    const eventCount = ctx.eventBus.getHistory(10).length;
    if (eventCount === 0) {
      alerts.push(
        createAlert(
          "SCHEDULER_STOPPED",
          "Scheduler has no tasks and event bus is idle",
          "scheduler",
          { ventureId: ctx.ventureId, severity: "medium" },
        ),
      );
    }
  }

  if (!isExecutionEngineAvailable(ctx) && queueSnapshot.metrics.running > 0) {
    alerts.push(
      createAlert(
        "EXECUTION_BLOCKED",
        "Tasks running but execution engine unavailable (Epic 4.5 stub)",
        "execution-engine",
        {
          ventureId: ctx.ventureId,
          severity: "high",
          metadata: { runningTasks: queueSnapshot.metrics.running },
        },
      ),
    );
  }

  const observations = getExecutiveObservations(ctx.ventureId).slice(0, 5);
  for (const obs of observations) {
    if (obs.latencyMs > slowMs) {
      alerts.push(
        createAlert(
          "AI_PROVIDER_SLOW",
          `AI provider ${obs.provider} slow: ${obs.latencyMs}ms`,
          "ai-gateway",
          {
            ventureId: ctx.ventureId,
            severity: obs.latencyMs > slowMs * 2 ? "high" : "medium",
            metadata: { provider: obs.provider, latencyMs: obs.latencyMs },
          },
        ),
      );
    }
  }

  const memoryHealth = components.find((c) => c.component === "memory");
  if (memoryHealth?.level === "DEGRADED" || memoryHealth?.level === "CRITICAL") {
    alerts.push(
      createAlert("MEMORY_INCONSISTENT", memoryHealth.message, "memory", {
        ventureId: ctx.ventureId,
        severity: "medium",
      }),
    );
  }

  if (workerMetrics.byStatus.BLOCKED > workers.length * 0.3 && workers.length > 0) {
    alerts.push(
      createAlert(
        "EXECUTION_BLOCKED",
        `${workerMetrics.byStatus.BLOCKED} workers blocked`,
        "worker-runtime",
        { ventureId: ctx.ventureId, severity: "medium" },
      ),
    );
  }

  return alerts;
}

export function storeAlerts(
  store: ObservabilityStore,
  alerts: RuntimeAlert[],
  options: RuntimeMonitorOptions = {},
): RuntimeAlert[] {
  const limits = getStoreLimits(options);
  for (const alert of alerts) {
    const exists = store.alerts.some(
      (a) => a.type === alert.type && a.message === alert.message && !a.acknowledged,
    );
    if (!exists) {
      pushBounded(store.alerts, alert, limits.alerts);
      const historyEntry: HistoryEntry = {
        id: nextObservabilityId("hist"),
        timestamp: alert.timestamp,
        kind: "alert",
        summary: `[${alert.level}] ${alert.message}`,
        payload: { alertId: alert.id, type: alert.type },
      };
      pushBounded(store.history, historyEntry, limits.history);
    }
  }
  return alerts;
}

export function acknowledgeAlert(store: ObservabilityStore, alertId: string): boolean {
  const alert = store.alerts.find((a) => a.id === alertId);
  if (!alert) return false;
  alert.acknowledged = true;
  return true;
}

export function getActiveAlerts(store: ObservabilityStore): RuntimeAlert[] {
  return store.alerts.filter((a) => !a.acknowledged);
}
