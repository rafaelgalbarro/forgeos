import type { BetaAnalyticsEvent, BetaAnalyticsEventRecord } from "./types";
import { isBetaAnalyticsEnabled, getBetaAnalyticsEndpoint } from "./config";
import { readStorage, writeStorage } from "./storage";

const STORAGE_KEY = "forgeos-beta-analytics";
const MAX_EVENTS = 500;
const PREFIX = "[ForgeOS Beta Analytics]";

let memoryEvents: BetaAnalyticsEventRecord[] = [];

function read(): BetaAnalyticsEventRecord[] {
  if (typeof window === "undefined") return memoryEvents;
  const stored = readStorage<BetaAnalyticsEventRecord[]>(STORAGE_KEY, []);
  memoryEvents = stored;
  return memoryEvents;
}

function write(events: BetaAnalyticsEventRecord[]): void {
  const trimmed = events.slice(-MAX_EVENTS);
  memoryEvents = trimmed;
  writeStorage(STORAGE_KEY, trimmed);
}

export function listAnalyticsEvents(): BetaAnalyticsEventRecord[] {
  return read();
}

export function getAnalyticsEventCount(): number {
  return read().length;
}

export function trackBetaEvent(input: {
  event: BetaAnalyticsEvent;
  path?: string;
  userId?: string;
  workspaceId?: string;
  label?: string;
  meta?: Record<string, string>;
}): BetaAnalyticsEventRecord {
  const record: BetaAnalyticsEventRecord = {
    id: `bae-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event: input.event,
    path: input.path,
    userId: input.userId,
    workspaceId: input.workspaceId,
    label: input.label,
    meta: input.meta,
    timestamp: new Date().toISOString(),
  };

  const events = [...read(), record];
  write(events);

  if (typeof window !== "undefined") {
    console.log(PREFIX, record.event, record);
  }

  if (isBetaAnalyticsEnabled()) {
    postAnalyticsOptional(record);
  }

  return record;
}

async function postAnalyticsOptional(record: BetaAnalyticsEventRecord): Promise<void> {
  const endpoint = getBetaAnalyticsEndpoint();
  if (!endpoint || typeof fetch === "undefined") return;
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch {
    /* optional post — swallow errors */
  }
}

export function trackBetaPageView(path: string, userId?: string): void {
  trackBetaEvent({ event: "page_view", path, userId });
}

export function clearAnalyticsEvents(): void {
  memoryEvents = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
