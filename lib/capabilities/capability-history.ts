/** ForgeOS Capability Layer — history (RC4.9). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { CapabilityMemoryRecord, CapabilityResult } from "./types";

function readHistory(): CapabilityMemoryRecord[] {
  return readStorage<CapabilityMemoryRecord[]>(STORAGE_KEYS.capabilityHistory, []);
}

function writeHistory(records: CapabilityMemoryRecord[]): void {
  writeStorage(STORAGE_KEYS.capabilityHistory, records.slice(0, 500));
}

export function appendCapabilityMemory(
  record: Omit<CapabilityMemoryRecord, "id" | "timestamp">
): CapabilityMemoryRecord {
  const entry: CapabilityMemoryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const records = readHistory();
  records.unshift(entry);
  writeHistory(records);
  return entry;
}

export function recordFromCapabilityResult(
  result: CapabilityResult,
  ventureId: string,
  requestedBy: CapabilityMemoryRecord["requestedBy"]
): CapabilityMemoryRecord {
  return appendCapabilityMemory({
    ventureId,
    capabilityId: result.capabilityId,
    requestedBy,
    result: result.output,
    skillIds: result.skillResults.map((s) => s.skillId),
    costEstimate: result.costEstimate,
    latencyMs: result.latencyMs,
    confidence: result.confidence,
  });
}

export function getCapabilityHistory(ventureId?: string): CapabilityMemoryRecord[] {
  const records = readHistory();
  return ventureId ? records.filter((r) => r.ventureId === ventureId) : records;
}
