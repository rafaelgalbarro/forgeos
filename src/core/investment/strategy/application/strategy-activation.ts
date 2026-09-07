/**
 * Strategy enable/disable persistence for Strategy Center.
 * In-memory by default; optional FS adapter. Analysis-only — no order path.
 */

import type { StrategyId } from "../domain/types";

export interface StrategyActivationState {
  readonly strategyId: StrategyId;
  readonly enabled: boolean;
  readonly updatedAt: string;
}

export interface StrategyActivationStore {
  isEnabled(strategyId: StrategyId): boolean;
  setEnabled(strategyId: StrategyId, enabled: boolean): StrategyActivationState;
  list(): readonly StrategyActivationState[];
  snapshot(): Readonly<Record<string, boolean>>;
}

export class InMemoryStrategyActivationStore implements StrategyActivationStore {
  private readonly enabled = new Map<StrategyId, boolean>();
  private readonly updatedAt = new Map<StrategyId, string>();

  constructor(initialEnabledIds?: readonly StrategyId[]) {
    if (initialEnabledIds) {
      const now = new Date().toISOString();
      for (const id of initialEnabledIds) {
        this.enabled.set(id, true);
        this.updatedAt.set(id, now);
      }
    }
  }

  isEnabled(strategyId: StrategyId): boolean {
    // Default: enabled when never toggled
    return this.enabled.get(strategyId) ?? true;
  }

  setEnabled(strategyId: StrategyId, enabled: boolean): StrategyActivationState {
    const updatedAt = new Date().toISOString();
    this.enabled.set(strategyId, enabled);
    this.updatedAt.set(strategyId, updatedAt);
    return { strategyId, enabled, updatedAt };
  }

  list(): readonly StrategyActivationState[] {
    const ids = new Set<StrategyId>([...this.enabled.keys()]);
    return [...ids].map((strategyId) => ({
      strategyId,
      enabled: this.isEnabled(strategyId),
      updatedAt: this.updatedAt.get(strategyId) ?? new Date(0).toISOString(),
    }));
  }

  snapshot(): Readonly<Record<string, boolean>> {
    const out: Record<string, boolean> = {};
    for (const [id, value] of this.enabled) {
      out[id] = value;
    }
    return out;
  }
}

let singleton: InMemoryStrategyActivationStore | undefined;

export function getStrategyActivationStore(): InMemoryStrategyActivationStore {
  if (!singleton) singleton = new InMemoryStrategyActivationStore();
  return singleton;
}

/** Test helper */
export function resetStrategyActivationStoreForTests(): void {
  singleton = new InMemoryStrategyActivationStore();
}
