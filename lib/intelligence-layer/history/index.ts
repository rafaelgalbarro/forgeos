import type { HistoricalEvent } from "../types";
import { STORAGE_KEYS } from "../memory/types";
import { readStorage, writeStorage } from "../memory/storage";

export function recordVentureHistoryEvent(
  event: Omit<HistoricalEvent, "id">
): HistoricalEvent {
  const events = readStorage<HistoricalEvent[]>(STORAGE_KEYS.history, []);
  const record: HistoricalEvent = { ...event, id: crypto.randomUUID() };
  events.unshift(record);
  writeStorage(STORAGE_KEYS.history, events.slice(0, 500));
  return record;
}

export function getHistoryForVenture(ventureId: string): HistoricalEvent[] {
  return readStorage<HistoricalEvent[]>(STORAGE_KEYS.history, []).filter(
    (e) => e.ventureId === ventureId
  );
}

export function getAllHistory(): HistoricalEvent[] {
  return readStorage<HistoricalEvent[]>(STORAGE_KEYS.history, []);
}
