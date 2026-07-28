/** Aggregated dashboard snapshot (Epic 4.6). */

import { detectRuntimeAlerts, storeAlerts, getActiveAlerts } from "./runtime-alerts";
import { runRuntimeDiagnostics, storeDiagnostics } from "./runtime-diagnostics";
import { computeOverallHealth, probeAllComponentHealth } from "./runtime-health";
import { recordHealthSnapshot, getObservabilityHistory } from "./runtime-history";
import { collectRuntimeMetrics } from "./runtime-metrics";
import { getProfilerSummary } from "./runtime-profiler";
import { generateRecoveryPlan, storeRecoveryPlan } from "./runtime-recovery";
import type { ObservabilityStore } from "./runtime-store";
import type {
  RuntimeDashboardSnapshot,
  RuntimeMonitorOptions,
  RuntimeObservabilityContext,
} from "./types";

export function buildRuntimeDashboard(
  ctx: RuntimeObservabilityContext,
  store: ObservabilityStore,
  options: RuntimeMonitorOptions = {},
): RuntimeDashboardSnapshot {
  const components = probeAllComponentHealth(ctx, options);
  const overallHealth = computeOverallHealth(components);
  recordHealthSnapshot(store, overallHealth, components.length, options);

  const metrics = collectRuntimeMetrics(ctx, store);
  const detectedAlerts = detectRuntimeAlerts(ctx, components, options);
  storeAlerts(store, detectedAlerts, options);
  const alerts = getActiveAlerts(store);

  const diagnostics = runRuntimeDiagnostics(ctx, options);
  storeDiagnostics(store, diagnostics, options);

  const recoveryPlan = generateRecoveryPlan(ctx, alerts);
  if (recoveryPlan) storeRecoveryPlan(store, recoveryPlan, options);

  const profiler = getProfilerSummary(store);
  const scheduler = ctx.scheduler.getSnapshot(ctx.ventureId);
  const queue = ctx.queue.getSnapshot(ctx.ventureId);
  const workers = ctx.workers.list();
  const recentEvents = ctx.eventBus.getHistory(30);

  return {
    overallHealth,
    components,
    metrics,
    alerts,
    errors: [...store.errors],
    traces: store.traces.slice(0, 50),
    recoveryPlan,
    diagnostics,
    profilerSamples: profiler.samples,
    history: getObservabilityHistory(store, { limit: 50 }),
    scheduler,
    queue,
    workers,
    recentEvents,
    generatedAt: new Date().toISOString(),
  };
}
