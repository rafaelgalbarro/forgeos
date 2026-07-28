/**
 * PROGRAM 6070 — Migration telemetry (fallbacks, divergences, errors).
 * In-memory ring buffer; never hides incompatibilities.
 */

import type {
  DivergenceEvent,
  DualWriteResult,
  FallbackEvent,
  MigrationComponentId,
  MigrationTelemetrySnapshot,
} from "./types";

const MAX_EVENTS = 500;

const fallbacks: FallbackEvent[] = [];
const divergences: DivergenceEvent[] = [];
const errors: Array<{ component: MigrationComponentId; message: string; at: string }> = [];
const dualWriteLog: DualWriteResult[] = [];

function pushBounded<T>(buf: T[], item: T): void {
  buf.push(item);
  if (buf.length > MAX_EVENTS) buf.splice(0, buf.length - MAX_EVENTS);
}

export function recordFallback(event: FallbackEvent): void {
  pushBounded(fallbacks, event);
  // eslint-disable-next-line no-console
  console.warn(
    `[migration:fallback] ${event.component}: ${event.reason}${event.details ? ` — ${event.details}` : ""}`,
  );
}

export function recordDivergence(event: DivergenceEvent): void {
  pushBounded(divergences, event);
  // eslint-disable-next-line no-console
  console.warn(`[migration:divergence] ${event.component}/${event.kind}: ${event.message}`);
}

export function recordError(component: MigrationComponentId, message: string): void {
  const at = new Date().toISOString();
  pushBounded(errors, { component, message, at });
  // eslint-disable-next-line no-console
  console.error(`[migration:error] ${component}: ${message}`);
}

export function recordDualWrite(result: DualWriteResult): void {
  pushBounded(dualWriteLog, result);
}

export function getMigrationTelemetry(): MigrationTelemetrySnapshot {
  return {
    fallbacks: [...fallbacks],
    divergences: [...divergences],
    errors: [...errors],
    dualWriteLog: [...dualWriteLog],
  };
}

export function resetMigrationTelemetry(): void {
  fallbacks.length = 0;
  divergences.length = 0;
  errors.length = 0;
  dualWriteLog.length = 0;
}

export function countFallbacks(component?: MigrationComponentId): number {
  return component ? fallbacks.filter((f) => f.component === component).length : fallbacks.length;
}

export function countDivergences(component?: MigrationComponentId): number {
  return component ? divergences.filter((d) => d.component === component).length : divergences.length;
}
