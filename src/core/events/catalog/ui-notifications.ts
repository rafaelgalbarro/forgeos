/** PROGRAM 6040 — UI notification catalog (presentation only). */

import type { CatalogEntry } from "./domain-events";

export type UiNotificationEventType =
  | "UI_TOAST"
  | "UI_BANNER"
  | "UI_MISSION_ACTIVITY"
  | "UI_TIMELINE_ROW"
  | "UI_STATUS_BADGE";

export const UI_NOTIFICATION_CATALOG: readonly CatalogEntry[] = [
  { type: "UI_TOAST", version: 1, label: "Toast", description: "Transient UI toast" },
  { type: "UI_BANNER", version: 1, label: "Banner", description: "Persistent UI banner" },
  { type: "UI_MISSION_ACTIVITY", version: 1, label: "Mission activity", description: "Live Mission activity row" },
  { type: "UI_TIMELINE_ROW", version: 1, label: "Timeline row", description: "Mission timeline presentation row" },
  { type: "UI_STATUS_BADGE", version: 1, label: "Status badge", description: "Status badge update" },
] as const;

export function isUiNotificationEvent(type: string): boolean {
  return UI_NOTIFICATION_CATALOG.some((e) => e.type === type);
}
