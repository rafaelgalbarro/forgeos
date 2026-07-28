/** ForgeOS Capability Layer — events (RC4.9). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { CapabilityEvent } from "./types";

function readEvents(): CapabilityEvent[] {
  return readStorage<CapabilityEvent[]>(STORAGE_KEYS.capabilityEvents, []);
}

function writeEvents(events: CapabilityEvent[]): void {
  writeStorage(STORAGE_KEYS.capabilityEvents, events.slice(0, 1000));
}

export function emitCapabilityEvent(
  event: Omit<CapabilityEvent, "id" | "timestamp">
): CapabilityEvent {
  const entry: CapabilityEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const events = readEvents();
  events.unshift(entry);
  writeEvents(events);
  return entry;
}

export function getCapabilityEvents(ventureId?: string): CapabilityEvent[] {
  const events = readEvents();
  return ventureId ? events.filter((e) => e.ventureId === ventureId) : events;
}
