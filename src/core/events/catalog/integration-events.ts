/** PROGRAM 6040 — Integration event catalog (external / boundary). */

import type { CatalogEntry } from "./domain-events";

export type IntegrationCatalogEventType =
  | "RUNTIME_EVENT_INGESTED"
  | "LIVE_MISSION_EVENT_INGESTED"
  | "MISSION_HISTORY_INGESTED"
  | "BUILD_PIPELINE_EVENT_INGESTED"
  | "PREVIEW_RUNTIME_EVENT_INGESTED"
  | "DEPLOYMENT_EVENT_INGESTED"
  | "FACTORY_EVENT_INGESTED"
  | "FOS_EVENT_INGESTED"
  | "PLATFORM_EVENT_INGESTED";

export const INTEGRATION_EVENT_CATALOG: readonly CatalogEntry[] = [
  { type: "RUNTIME_EVENT_INGESTED", version: 1, label: "Runtime event ingested", description: "Wrapped runtime bus event" },
  { type: "LIVE_MISSION_EVENT_INGESTED", version: 1, label: "Live mission event ingested", description: "Wrapped live-mission event" },
  { type: "MISSION_HISTORY_INGESTED", version: 1, label: "Mission history ingested", description: "Wrapped mission-history entry" },
  { type: "BUILD_PIPELINE_EVENT_INGESTED", version: 1, label: "Build pipeline event ingested", description: "Wrapped build pipeline event" },
  { type: "PREVIEW_RUNTIME_EVENT_INGESTED", version: 1, label: "Preview runtime event ingested", description: "Wrapped preview runtime event" },
  { type: "DEPLOYMENT_EVENT_INGESTED", version: 1, label: "Deployment event ingested", description: "Wrapped deployment event" },
  { type: "FACTORY_EVENT_INGESTED", version: 1, label: "Factory event ingested", description: "Wrapped factory event" },
  { type: "FOS_EVENT_INGESTED", version: 1, label: "FOS event ingested", description: "Wrapped FOS event-bus event" },
  { type: "PLATFORM_EVENT_INGESTED", version: 1, label: "Platform event ingested", description: "Wrapped platform event" },
] as const;

export function isIntegrationCatalogEvent(type: string): boolean {
  return INTEGRATION_EVENT_CATALOG.some((e) => e.type === type);
}
