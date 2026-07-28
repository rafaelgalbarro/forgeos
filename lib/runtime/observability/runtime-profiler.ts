/** Runtime profiler — performance sampling (Epic 4.6). */

import {
  getStoreLimits,
  nextObservabilityId,
  pushBounded,
  type ObservabilityStore,
} from "./runtime-store";
import type { ProfilerSample, RuntimeComponentId } from "./types";

export function recordProfilerSample(
  store: ObservabilityStore,
  label: string,
  component: RuntimeComponentId,
  durationMs: number,
  metadata?: Record<string, unknown>,
): ProfilerSample {
  const sample: ProfilerSample = {
    id: nextObservabilityId("prof"),
    label,
    component,
    durationMs,
    timestamp: new Date().toISOString(),
    metadata,
  };
  const limits = getStoreLimits({});
  pushBounded(store.profilerSamples, sample, limits.profiler);
  return sample;
}

export async function profileAsync<T>(
  store: ObservabilityStore,
  label: string,
  component: RuntimeComponentId,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordProfilerSample(store, label, component, Math.round(performance.now() - start));
  }
}

export function profileSync<T>(
  store: ObservabilityStore,
  label: string,
  component: RuntimeComponentId,
  fn: () => T,
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordProfilerSample(store, label, component, Math.round(performance.now() - start));
  }
}

export function getProfilerSummary(store: ObservabilityStore): {
  samples: ProfilerSample[];
  avgByComponent: Record<string, number>;
  slowest: ProfilerSample | null;
} {
  const samples = [...store.profilerSamples];
  const byComponent: Record<string, number[]> = {};

  for (const s of samples) {
    if (!byComponent[s.component]) byComponent[s.component] = [];
    byComponent[s.component]!.push(s.durationMs);
  }

  const avgByComponent: Record<string, number> = {};
  for (const [comp, durations] of Object.entries(byComponent)) {
    avgByComponent[comp] = Math.round(
      durations.reduce((a, b) => a + b, 0) / durations.length,
    );
  }

  const slowest =
    samples.length > 0
      ? samples.reduce((a, b) => (a.durationMs > b.durationMs ? a : b))
      : null;

  return { samples: samples.slice(0, 50), avgByComponent, slowest };
}
