import type { DesignPartnerAnalyticsEvent, DesignPartnerAnalyticsRecord, JourneyStage } from "./types";
import { isDesignPartnerAnalyticsEnabled, getDesignPartnerAnalyticsEndpoint } from "./config";
import { readStorage, writeStorage } from "./storage";
import { trackBetaEvent } from "@/lib/beta-platform/analytics";

const STORAGE_KEY = "forgeos-dp-analytics";
const MAX_EVENTS = 1000;
const PREFIX = "[ForgeOS Design Partner Analytics]";

let memoryEvents: DesignPartnerAnalyticsRecord[] = [];

function read(): DesignPartnerAnalyticsRecord[] {
  if (typeof window === "undefined") return memoryEvents;
  const stored = readStorage<DesignPartnerAnalyticsRecord[]>(STORAGE_KEY, []);
  memoryEvents = stored;
  return memoryEvents;
}

function write(events: DesignPartnerAnalyticsRecord[]): void {
  const trimmed = events.slice(-MAX_EVENTS);
  memoryEvents = trimmed;
  writeStorage(STORAGE_KEY, trimmed);
}

export function listDesignPartnerEvents(): DesignPartnerAnalyticsRecord[] {
  return read();
}

export function getDesignPartnerEventCount(): number {
  return read().length;
}

export function trackDesignPartnerEvent(input: {
  event: DesignPartnerAnalyticsEvent;
  path?: string;
  userId?: string;
  workspaceId?: string;
  stage?: JourneyStage;
  label?: string;
  meta?: Record<string, string>;
}): DesignPartnerAnalyticsRecord {
  const record: DesignPartnerAnalyticsRecord = {
    id: `dpa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event: input.event,
    path: input.path,
    userId: input.userId,
    workspaceId: input.workspaceId,
    stage: input.stage,
    label: input.label,
    meta: input.meta,
    timestamp: new Date().toISOString(),
  };

  write([...read(), record]);

  if (typeof window !== "undefined") {
    console.log(PREFIX, record.event, record);
  }

  if (input.path) {
    trackBetaEvent({
      event: "page_view",
      path: input.path,
      userId: input.userId,
      workspaceId: input.workspaceId,
      label: input.label,
      meta: { dp_event: input.event, ...input.meta },
    });
  }

  if (isDesignPartnerAnalyticsEnabled()) {
    postAnalyticsOptional(record);
  }

  return record;
}

async function postAnalyticsOptional(record: DesignPartnerAnalyticsRecord): Promise<void> {
  const endpoint = getDesignPartnerAnalyticsEndpoint();
  if (!endpoint || typeof fetch === "undefined") return;
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch {
    /* optional post */
  }
}

export function trackDesignPartnerPageView(
  path: string,
  userId?: string,
  workspaceId?: string
): void {
  trackDesignPartnerEvent({ event: "dp_page_view", path, userId, workspaceId });
}

export function clearDesignPartnerEvents(): void {
  memoryEvents = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export {
  listAnalyticsEvents,
  getAnalyticsEventCount,
  trackBetaEvent,
  trackBetaPageView,
} from "@/lib/beta-platform/analytics";
