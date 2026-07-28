/** ForgeOS Venture State Machine — in-memory transition history (Epic 4.2). */

import type { TransitionHistoryRecord } from "./types";

const DEFAULT_MAX_HISTORY = 500;

let recordCounter = 0;

export function nextHistoryId(): string {
  recordCounter += 1;
  return `vsh_${Date.now()}_${recordCounter}`;
}

/** @internal Reset id counter for deterministic tests. */
export function __resetHistoryIdCounterForTests(): void {
  recordCounter = 0;
}

export class VentureStateHistoryStore {
  private readonly maxHistory: number;
  private readonly records: TransitionHistoryRecord[] = [];

  constructor(maxHistory = DEFAULT_MAX_HISTORY) {
    this.maxHistory = maxHistory;
  }

  append(record: TransitionHistoryRecord): void {
    this.records.push(record);
    if (this.records.length > this.maxHistory) {
      this.records.splice(0, this.records.length - this.maxHistory);
    }
  }

  getAll(ventureId?: string, limit = 50): TransitionHistoryRecord[] {
    let filtered = ventureId
      ? this.records.filter((r) => r.ventureId === ventureId)
      : [...this.records];
    if (limit <= 0) return [];
    return filtered.slice(-limit);
  }

  clear(): void {
    this.records.length = 0;
  }
}
