/** PROGRAM 6040 — Event catalog kinds (no catch-all). */

export type EventCatalogKind =
  | "domain"
  | "application"
  | "integration"
  | "telemetry"
  | "ui_notification";

export const EVENT_CATALOG_KINDS: readonly EventCatalogKind[] = [
  "domain",
  "application",
  "integration",
  "telemetry",
  "ui_notification",
] as const;

export function isEventCatalogKind(value: string): value is EventCatalogKind {
  return (EVENT_CATALOG_KINDS as readonly string[]).includes(value);
}

/**
 * Telemetry must never be promoted to domain events.
 * UI notifications are presentation-only.
 */
export function mayDriveStateTransition(kind: EventCatalogKind): boolean {
  return kind === "domain" || kind === "application";
}

export function isTelemetryOnly(kind: EventCatalogKind): boolean {
  return kind === "telemetry";
}
