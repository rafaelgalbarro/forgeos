/**
 * Strategy Lab versioning — each modification creates a new version; never overwrite.
 * Production versions are locked (productionMutable: false always).
 */

import type { StrategyLabMetrics, StrategyLabVersionEntry } from "../domain/types";
import { emptyStrategyLabMetrics } from "./metrics";

export class StrategyLabVersionStore {
  private readonly byStrategy = new Map<string, StrategyLabVersionEntry[]>();

  list(strategyId: string): readonly StrategyLabVersionEntry[] {
    return this.byStrategy.get(strategyId) ?? [];
  }

  listAll(): readonly StrategyLabVersionEntry[] {
    return [...this.byStrategy.values()].flat();
  }

  current(strategyId: string): StrategyLabVersionEntry | null {
    const list = this.byStrategy.get(strategyId);
    if (!list || list.length === 0) return null;
    return list[list.length - 1] ?? null;
  }

  /**
   * Append a new version. Previous active_lab entries become superseded.
   * Never mutates production_locked entries.
   */
  commit(input: {
    readonly strategyId: string;
    readonly changeSummary: string;
    readonly metrics?: StrategyLabMetrics;
    readonly createdAt?: string;
  }): StrategyLabVersionEntry {
    const prev = this.list(input.strategyId);
    const parent = prev.length > 0 ? prev[prev.length - 1]! : null;
    const nextMajor = parent ? Number.parseInt(parent.version.split(".")[0] ?? "0", 10) + 1 : 1;
    const version = `${Number.isFinite(nextMajor) ? nextMajor : 1}.0.0-lab`;

    const updatedPrev = prev.map((entry) =>
      entry.status === "active_lab"
        ? { ...entry, status: "superseded" as const }
        : entry,
    );

    const entry: StrategyLabVersionEntry = {
      strategyId: input.strategyId,
      version,
      createdAt: input.createdAt ?? new Date().toISOString(),
      parentVersion: parent?.version ?? null,
      changeSummary: input.changeSummary,
      status: "active_lab",
      metrics: input.metrics ?? emptyStrategyLabMetrics(),
      productionMutable: false,
    };

    this.byStrategy.set(input.strategyId, [...updatedPrev, entry]);
    return entry;
  }

  seedIfEmpty(strategyId: string, version: string, metrics: StrategyLabMetrics): StrategyLabVersionEntry {
    const existing = this.current(strategyId);
    if (existing) return existing;
    const entry: StrategyLabVersionEntry = {
      strategyId,
      version: `${version}-lab`,
      createdAt: new Date().toISOString(),
      parentVersion: null,
      changeSummary: "Initial Strategy Lab registration from Strategy Engine metadata",
      status: "active_lab",
      metrics,
      productionMutable: false,
    };
    this.byStrategy.set(strategyId, [entry]);
    return entry;
  }
}

let singleton: StrategyLabVersionStore | null = null;

export function getStrategyLabVersionStore(): StrategyLabVersionStore {
  if (!singleton) singleton = new StrategyLabVersionStore();
  return singleton;
}

export function resetStrategyLabVersionStoreForTests(): void {
  singleton = new StrategyLabVersionStore();
}
