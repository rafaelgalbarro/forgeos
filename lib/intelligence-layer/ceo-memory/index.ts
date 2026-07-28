import type { CeoBriefing, CeoMemory, CeoPriority, CeoResult, Recommendation } from "../types";
import { STORAGE_KEYS } from "../memory/types";
import { readStorage, writeStorage } from "../memory/storage";

const EMPTY_CEO_MEMORY: CeoMemory = {
  briefings: [],
  recommendations: [],
  priorities: [],
  results: [],
  updatedAt: new Date().toISOString(),
};

export function getCeoMemory(): CeoMemory {
  return readStorage<CeoMemory>(STORAGE_KEYS.ceoMemory, EMPTY_CEO_MEMORY);
}

export function saveCeoMemory(memory: CeoMemory): void {
  writeStorage(STORAGE_KEYS.ceoMemory, { ...memory, updatedAt: new Date().toISOString() });
}

export function addCeoBriefing(briefing: Omit<CeoBriefing, "id">): CeoBriefing {
  const memory = getCeoMemory();
  const record: CeoBriefing = { ...briefing, id: crypto.randomUUID() };
  memory.briefings.unshift(record);
  saveCeoMemory(memory);
  return record;
}

export function addCeoPriority(priority: Omit<CeoPriority, "id" | "createdAt">): CeoPriority {
  const memory = getCeoMemory();
  const record: CeoPriority = {
    ...priority,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  memory.priorities.push(record);
  saveCeoMemory(memory);
  return record;
}

export function addCeoResult(result: Omit<CeoResult, "id">): CeoResult {
  const memory = getCeoMemory();
  const record: CeoResult = { ...result, id: crypto.randomUUID() };
  memory.results.unshift(record);
  saveCeoMemory(memory);
  return record;
}

export function storeCeoRecommendations(recommendations: Recommendation[]): void {
  const memory = getCeoMemory();
  memory.recommendations = recommendations;
  saveCeoMemory(memory);
}

export function updateCeoPriorityStatus(
  id: string,
  status: CeoPriority["status"]
): CeoPriority | undefined {
  const memory = getCeoMemory();
  const i = memory.priorities.findIndex((p) => p.id === id);
  if (i < 0) return undefined;
  memory.priorities[i] = { ...memory.priorities[i], status };
  saveCeoMemory(memory);
  return memory.priorities[i];
}
