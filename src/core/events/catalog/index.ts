/** PROGRAM 6040 — Event catalog index (separated kinds, no catch-all). */

import type { EventCatalogKind } from "./kinds";
import { EVENT_CATALOG_KINDS, isEventCatalogKind, mayDriveStateTransition, isTelemetryOnly } from "./kinds";
import { DOMAIN_EVENT_CATALOG, isDomainCatalogEvent, type DomainCatalogEventType } from "./domain-events";
import {
  APPLICATION_EVENT_CATALOG,
  isApplicationCatalogEvent,
  type ApplicationCatalogEventType,
} from "./application-events";
import {
  INTEGRATION_EVENT_CATALOG,
  isIntegrationCatalogEvent,
  type IntegrationCatalogEventType,
} from "./integration-events";
import {
  TELEMETRY_EVENT_CATALOG,
  isTelemetryCatalogEvent,
  type TelemetryCatalogEventType,
} from "./telemetry-events";
import {
  UI_NOTIFICATION_CATALOG,
  isUiNotificationEvent,
  type UiNotificationEventType,
} from "./ui-notifications";
import type { CatalogEntry } from "./domain-events";

export type {
  EventCatalogKind,
  DomainCatalogEventType,
  ApplicationCatalogEventType,
  IntegrationCatalogEventType,
  TelemetryCatalogEventType,
  UiNotificationEventType,
  CatalogEntry,
};

export {
  EVENT_CATALOG_KINDS,
  isEventCatalogKind,
  mayDriveStateTransition,
  isTelemetryOnly,
  DOMAIN_EVENT_CATALOG,
  APPLICATION_EVENT_CATALOG,
  INTEGRATION_EVENT_CATALOG,
  TELEMETRY_EVENT_CATALOG,
  UI_NOTIFICATION_CATALOG,
  isDomainCatalogEvent,
  isApplicationCatalogEvent,
  isIntegrationCatalogEvent,
  isTelemetryCatalogEvent,
  isUiNotificationEvent,
};

export function catalogForKind(kind: EventCatalogKind): readonly CatalogEntry[] {
  switch (kind) {
    case "domain":
      return DOMAIN_EVENT_CATALOG;
    case "application":
      return APPLICATION_EVENT_CATALOG;
    case "integration":
      return INTEGRATION_EVENT_CATALOG;
    case "telemetry":
      return TELEMETRY_EVENT_CATALOG;
    case "ui_notification":
      return UI_NOTIFICATION_CATALOG;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function resolveCatalogKind(eventType: string): EventCatalogKind | null {
  if (isDomainCatalogEvent(eventType)) return "domain";
  if (isApplicationCatalogEvent(eventType)) return "application";
  if (isIntegrationCatalogEvent(eventType)) return "integration";
  if (isTelemetryCatalogEvent(eventType)) return "telemetry";
  if (isUiNotificationEvent(eventType)) return "ui_notification";
  return null;
}

export function assertKnownCatalogEvent(eventType: string, kind: EventCatalogKind): void {
  const found = catalogForKind(kind).some((e) => e.type === eventType);
  if (!found) {
    throw new Error(`Unknown ${kind} catalog event: ${eventType}`);
  }
}
