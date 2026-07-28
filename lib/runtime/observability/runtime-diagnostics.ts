/** Runtime diagnostics — report only, no auto-fix (Epic 4.6). */

import { listConfiguredProviders } from "@/lib/ai-gateway/registry";
import { getExecutiveObservations } from "@/lib/ai-orchestration/observability";
import {
  getStoreLimits,
  nextObservabilityId,
  pushBounded,
  type ObservabilityStore,
} from "./runtime-store";
import { EXECUTION_ENGINE_DEPENDENCY_NOTE, isExecutionEngineModuleAvailable, isExecutionEngineAvailable } from "./runtime-health";
import type {
  DiagnosticFinding,
  HistoryEntry,
  RuntimeMonitorOptions,
  RuntimeObservabilityContext,
} from "./types";

/** Static heuristics for known runtime module dependency graph. */
const EXPECTED_RUNTIME_MODULES = [
  { id: "event-bus", deps: [] as string[] },
  { id: "scheduler", deps: ["event-bus"] },
  { id: "state-machine", deps: ["event-bus"] },
  { id: "workers", deps: ["scheduler", "state-machine", "event-bus"] },
  { id: "task-queue", deps: ["scheduler", "workers", "event-bus"] },
  { id: "execution-engine", deps: ["task-queue", "workers"] },
];

export function detectCircularImportRisks(): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const graph = new Map(EXPECTED_RUNTIME_MODULES.map((m) => [m.id, m.deps]));

  function hasCycle(start: string, visited: Set<string>, stack: Set<string>): boolean {
    if (stack.has(start)) return true;
    if (visited.has(start)) return false;
    visited.add(start);
    stack.add(start);
    for (const dep of graph.get(start) ?? []) {
      if (hasCycle(dep, visited, stack)) return true;
    }
    stack.delete(start);
    return false;
  }

  for (const mod of EXPECTED_RUNTIME_MODULES) {
    if (hasCycle(mod.id, new Set(), new Set())) {
      findings.push({
        id: nextObservabilityId("diag"),
        category: "circular-import",
        severity: "error",
        component: "event-bus",
        message: `Potential circular dependency involving ${mod.id}`,
        suggestion: "Review direct imports between runtime modules",
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return findings;
}

export function runRuntimeDiagnostics(
  ctx: RuntimeObservabilityContext,
  options: RuntimeMonitorOptions = {},
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [...detectCircularImportRisks()];
  const workers = ctx.workers.list();
  const queueSnapshot = ctx.queue.getSnapshot(ctx.ventureId);
  const schedulerSnapshot = ctx.scheduler.getSnapshot(ctx.ventureId);
  const now = new Date().toISOString();

  const registeredIds = new Set(workers.map((w) => w.id));
  const recommendedIds = new Set(
    queueSnapshot.tasks
      .map((t) => t.recommendedWorkerId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const workerId of recommendedIds) {
    if (!registeredIds.has(workerId)) {
      findings.push({
        id: nextObservabilityId("diag"),
        category: "unregistered-worker",
        severity: "error",
        component: "worker-runtime",
        message: `Queue recommends unregistered worker: ${workerId}`,
        suggestion: "Register worker or update queue task recommendations",
        detectedAt: now,
      });
    }
  }

  const blockedWithoutDeps = queueSnapshot.tasks.filter(
    (t) => t.status === "BLOCKED" && t.dependsOn.length === 0 && t.dependencyMilestones.length === 0,
  );
  if (blockedWithoutDeps.length > 0) {
    findings.push({
      id: nextObservabilityId("diag"),
      category: "inconsistent-queue",
      severity: "warning",
      component: "task-queue",
      message: `${blockedWithoutDeps.length} blocked task(s) without declared dependencies`,
      suggestion: "Review queue dependency resolution logic",
      detectedAt: now,
    });
  }

  if (!isExecutionEngineAvailable(ctx) && isExecutionEngineModuleAvailable()) {
    findings.push({
      id: nextObservabilityId("diag"),
      category: "broken-dependency",
      severity: "warning",
      component: "execution-engine",
      message: "Execution engine module available but not wired to observability context",
      suggestion: "Pass executionEngine in RuntimeObservabilityContext for live probes",
      detectedAt: now,
    });
  } else if (!isExecutionEngineModuleAvailable()) {
    findings.push({
      id: nextObservabilityId("diag"),
      category: "broken-dependency",
      severity: "warning",
      component: "execution-engine",
      message: EXECUTION_ENGINE_DEPENDENCY_NOTE,
      suggestion: "Complete Epic 4.5 Execution Engine integration",
      detectedAt: now,
    });
  }

  const schedulerTypes = new Set(schedulerSnapshot.tasks.map((t) => t.type));
  const queueTypes = new Set(queueSnapshot.tasks.map((t) => t.type));
  for (const task of schedulerSnapshot.tasks) {
    if (task.status === "ready" && !queueTypes.has(task.type)) {
      findings.push({
        id: nextObservabilityId("diag"),
        category: "missing-adapter",
        severity: "info",
        component: "task-queue",
        message: `Scheduler task ${task.type} ready but not in queue`,
        suggestion: "Run scheduler-adapter to plan tasks into queue",
        detectedAt: now,
      });
      break;
    }
  }

  const slowMs = options.aiSlowLatencyMs ?? 10_000;
  const slowObs = getExecutiveObservations(ctx.ventureId).filter(
    (o) => o.latencyMs > slowMs,
  );
  if (slowObs.length > 0) {
    findings.push({
      id: nextObservabilityId("diag"),
      category: "high-latency",
      severity: "warning",
      component: "ai-orchestration",
      message: `${slowObs.length} AI call(s) exceed ${slowMs}ms latency threshold`,
      suggestion: "Review provider configuration and model policies",
      detectedAt: now,
    });
  }

  const configured = listConfiguredProviders();
  if (configured.length === 0) {
    findings.push({
      id: nextObservabilityId("diag"),
      category: "unresponsive-provider",
      severity: "warning",
      component: "ai-gateway",
      message: "No configured AI providers — live calls will fail or use mocks",
      suggestion: "Configure ANTHROPIC_API_KEY or OPENAI_API_KEY",
      detectedAt: now,
    });
  }

  if (queueSnapshot.metrics.avgWaitMs > 60_000) {
    findings.push({
      id: nextObservabilityId("diag"),
      category: "high-latency",
      severity: "warning",
      component: "task-queue",
      message: `Average queue wait ${queueSnapshot.metrics.avgWaitMs}ms exceeds 60s`,
      suggestion: "Scale workers or reduce queue depth",
      detectedAt: now,
    });
  }

  return findings;
}

export function storeDiagnostics(
  store: ObservabilityStore,
  findings: DiagnosticFinding[],
  options: RuntimeMonitorOptions = {},
): DiagnosticFinding[] {
  const limits = getStoreLimits(options);
  for (const finding of findings) {
    const historyEntry: HistoryEntry = {
      id: nextObservabilityId("hist"),
      timestamp: finding.detectedAt,
      kind: "diagnostic",
      summary: `[${finding.category}] ${finding.message}`,
      payload: { findingId: finding.id, severity: finding.severity },
    };
    pushBounded(store.history, historyEntry, limits.history);
  }
  return findings;
}
