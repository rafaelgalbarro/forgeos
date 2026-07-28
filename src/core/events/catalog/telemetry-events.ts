/**
 * PROGRAM 6040 — Telemetry event catalog.
 * Telemetry is NOT a domain event and must never drive aggregate transitions.
 */

import type { CatalogEntry } from "./domain-events";

export type TelemetryCatalogEventType =
  | "HANDLER_DURATION_RECORDED"
  | "HANDLER_FAILURE_RECORDED"
  | "HANDLER_RETRY_RECORDED"
  | "EVENT_PROCESSING_STARTED"
  | "EVENT_PROCESSING_FINISHED"
  | "DEAD_LETTER_RECORDED"
  | "METRIC_SAMPLE";

export const TELEMETRY_EVENT_CATALOG: readonly CatalogEntry[] = [
  { type: "HANDLER_DURATION_RECORDED", version: 1, label: "Handler duration", description: "Handler processing duration sample" },
  { type: "HANDLER_FAILURE_RECORDED", version: 1, label: "Handler failure", description: "Handler failure recorded (no secrets)" },
  { type: "HANDLER_RETRY_RECORDED", version: 1, label: "Handler retry", description: "Handler retry recorded" },
  { type: "EVENT_PROCESSING_STARTED", version: 1, label: "Processing started", description: "Event processing started" },
  { type: "EVENT_PROCESSING_FINISHED", version: 1, label: "Processing finished", description: "Event processing finished" },
  { type: "DEAD_LETTER_RECORDED", version: 1, label: "Dead letter", description: "Handler dead-letter equivalent" },
  { type: "METRIC_SAMPLE", version: 1, label: "Metric sample", description: "Generic metric sample" },
] as const;

export function isTelemetryCatalogEvent(type: string): boolean {
  return TELEMETRY_EVENT_CATALOG.some((e) => e.type === type);
}
