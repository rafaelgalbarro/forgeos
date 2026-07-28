/** ForgeOS Skills Governance — Events (RC4.1). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { GovernanceStage } from "./types";

export interface GovernanceEvent {
  id: string;
  timestamp: string;
  stage: GovernanceStage;
  skillId: string;
  ventureId: string;
  message: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export function emitGovernanceEvent(
  event: Omit<GovernanceEvent, "id" | "timestamp">
): GovernanceEvent {
  const record: GovernanceEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const events = readStorage<GovernanceEvent[]>(STORAGE_KEYS.skillGovernanceEvents, []);
  events.unshift(record);
  writeStorage(STORAGE_KEYS.skillGovernanceEvents, events.slice(0, 1000));
  return record;
}

export function getGovernanceEvents(ventureId?: string): GovernanceEvent[] {
  const events = readStorage<GovernanceEvent[]>(STORAGE_KEYS.skillGovernanceEvents, []);
  return ventureId ? events.filter((e) => e.ventureId === ventureId) : events;
}

export function getEventsForExecution(executionId: string): GovernanceEvent[] {
  return getGovernanceEvents().filter(
    (e) => e.metadata?.executionId === executionId
  );
}
