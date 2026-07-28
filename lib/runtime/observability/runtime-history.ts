/** Observability history helpers (Epic 4.6). */

import type { ObservabilityStore } from "./runtime-store";
import type { HistoryEntry, RuntimeHealthLevel } from "./types";
import { nextObservabilityId, pushBounded, getStoreLimits } from "./runtime-store";
import type { RuntimeMonitorOptions } from "./types";

export function recordHealthSnapshot(
  store: ObservabilityStore,
  overallHealth: RuntimeHealthLevel,
  componentCount: number,
  options: RuntimeMonitorOptions = {},
): HistoryEntry {
  const entry: HistoryEntry = {
    id: nextObservabilityId("hist"),
    timestamp: new Date().toISOString(),
    kind: "health",
    summary: `Overall health: ${overallHealth} (${componentCount} components)`,
    payload: { overallHealth, componentCount },
  };
  const limits = getStoreLimits(options);
  pushBounded(store.history, entry, limits.history);
  return entry;
}

export function getObservabilityHistory(
  store: ObservabilityStore,
  filter?: { kind?: HistoryEntry["kind"]; limit?: number },
): HistoryEntry[] {
  let entries = [...store.history];
  if (filter?.kind) {
    entries = entries.filter((e) => e.kind === filter.kind);
  }
  const limit = filter?.limit ?? 100;
  return entries.slice(0, limit);
}

export function clearObservabilityHistory(store: ObservabilityStore): void {
  store.history.length = 0;
}
