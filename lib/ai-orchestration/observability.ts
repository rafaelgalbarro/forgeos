/** Executive runtime observability registry (Epic 3.2). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { AIProviderId } from "@/lib/ai-gateway/types";
import type { OrchestrationTaskId } from "./types";

export interface ExecutiveObservation {
  id: string;
  timestamp: string;
  task: OrchestrationTaskId | "EXECUTIVE_RUNTIME" | "CONSENSUS" | "BOARD_SESSION";
  provider: AIProviderId | "heuristic" | "mixed";
  model: string;
  latencyMs: number;
  estimatedTokens: number;
  costEstimate: number;
  fallbackUsed: boolean;
  warnings: string[];
  ventureId?: string;
  decisionId?: string;
  boardSessionId?: string;
}

const OBS_KEY = STORAGE_KEYS.executiveObservability;

function readObservations(): ExecutiveObservation[] {
  return readStorage<ExecutiveObservation[]>(OBS_KEY, []);
}

function writeObservations(records: ExecutiveObservation[]): void {
  writeStorage(OBS_KEY, records.slice(0, 500));
}

export function registerExecutiveObservation(
  record: Omit<ExecutiveObservation, "id" | "timestamp">
): ExecutiveObservation {
  const full: ExecutiveObservation = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const records = readObservations();
  records.unshift(full);
  writeObservations(records);

  if (process.env.NODE_ENV === "development") {
    console.info("[Executive Observability]", {
      task: full.task,
      provider: full.provider,
      model: full.model,
      latencyMs: full.latencyMs,
      ventureId: full.ventureId,
    });
  }

  return full;
}

export function getExecutiveObservations(ventureId?: string): ExecutiveObservation[] {
  const all = readObservations();
  return ventureId ? all.filter((o) => o.ventureId === ventureId) : all;
}

export function estimateTokens(inputSize: number, outputSize: number): number {
  return Math.ceil((inputSize + outputSize) / 4);
}
