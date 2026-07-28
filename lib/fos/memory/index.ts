import type { FosMetrics, FosVentureContext } from "../types";

export interface FosMemoryState {
  lastMetrics: FosMetrics | null;
  lastContexts: FosVentureContext[];
  lastRunAt: string | null;
  runCount: number;
}

const state: FosMemoryState = {
  lastMetrics: null,
  lastContexts: [],
  lastRunAt: null,
  runCount: 0,
};

export function readFosMemory(): Readonly<FosMemoryState> {
  return { ...state, lastContexts: [...state.lastContexts] };
}

export function writeFosMemory(
  metrics: FosMetrics,
  contexts: FosVentureContext[]
): void {
  state.lastMetrics = metrics;
  state.lastContexts = contexts;
  state.lastRunAt = new Date().toISOString();
  state.runCount += 1;
}

export function clearFosMemory(): void {
  state.lastMetrics = null;
  state.lastContexts = [];
  state.lastRunAt = null;
  state.runCount = 0;
}
