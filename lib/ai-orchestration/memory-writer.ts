/** ForgeOS AI Orchestration — execution memory writer. */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { AiExecutionRecord } from "./types";

function readExecutions(): AiExecutionRecord[] {
  return readStorage<AiExecutionRecord[]>(STORAGE_KEYS.aiOrchestrationExecutions, []);
}

function writeExecutions(records: AiExecutionRecord[]): void {
  writeStorage(STORAGE_KEYS.aiOrchestrationExecutions, records.slice(0, 1000));
}

export function writeAiExecutionMemory(
  record: Omit<AiExecutionRecord, "id" | "timestamp">
): AiExecutionRecord {
  const full: AiExecutionRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const records = readExecutions();
  records.unshift(full);
  writeExecutions(records);
  return full;
}

export function getExecutionsForVenture(ventureId: string): AiExecutionRecord[] {
  return readExecutions().filter((r) => r.ventureId === ventureId);
}

export function getAllAiExecutions(): AiExecutionRecord[] {
  return readExecutions();
}
