/** In-memory observability store (Epic 4.6). */

import type {
  HistoryEntry,
  ProfilerSample,
  RuntimeAlert,
  RuntimeErrorRecord,
  RuntimeMonitorOptions,
  RuntimeTrace,
} from "./types";

export interface ObservabilityStore {
  traces: RuntimeTrace[];
  alerts: RuntimeAlert[];
  errors: RuntimeErrorRecord[];
  history: HistoryEntry[];
  profilerSamples: ProfilerSample[];
  startedAt: number;
}

const DEFAULT_MAX = 200;

export function createObservabilityStore(options: RuntimeMonitorOptions = {}): ObservabilityStore {
  return {
    traces: [],
    alerts: [],
    errors: [],
    history: [],
    profilerSamples: [],
    startedAt: Date.now(),
  };
}

let counter = 0;

export function nextObservabilityId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

export function pushBounded<T>(arr: T[], item: T, max: number): void {
  arr.unshift(item);
  if (arr.length > max) arr.length = max;
}

export function getStoreLimits(options: RuntimeMonitorOptions) {
  return {
    traces: options.maxTraces ?? DEFAULT_MAX,
    alerts: options.maxAlerts ?? DEFAULT_MAX,
    errors: options.maxErrors ?? DEFAULT_MAX,
    history: options.maxHistory ?? DEFAULT_MAX,
    profiler: DEFAULT_MAX,
  };
}

/** @internal Reset id counter for deterministic tests. */
export function __resetObservabilityIdCounterForTests(): void {
  counter = 0;
}
