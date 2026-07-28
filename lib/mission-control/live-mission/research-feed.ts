/** Research events stream. */

import type { FeedItem, TaskStatus } from "./types";

const MAX_ITEMS = 20;

function feedId(): string {
  return `rf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function appendResearchEvent(
  feed: FeedItem[],
  label: string,
  status?: TaskStatus
): FeedItem[] {
  const item: FeedItem = {
    id: feedId(),
    timestamp: nowTime(),
    source: "research",
    label,
    status,
  };
  return [item, ...feed].slice(0, MAX_ITEMS);
}
