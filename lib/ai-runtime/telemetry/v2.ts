/** ForgeOS AI Runtime RC6 — extended telemetry. */

import type { AITask } from "@/lib/ai-gateway/types";
import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { RuntimeProviderId } from "../types";

export interface ExtendedTelemetryRecord {
  id: string;
  timestamp: string;
  task: AITask;
  provider: RuntimeProviderId;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  costEstimate: number;
  cacheHit: boolean;
  fallbackUsed: boolean;
  retries: number;
  error?: string;
  confidence: number;
  department?: string;
  capability?: string;
  skill?: string;
  streaming: boolean;
}

function readExtended(): ExtendedTelemetryRecord[] {
  return readStorage<ExtendedTelemetryRecord[]>(STORAGE_KEYS.aiRuntimeTelemetryV2, []);
}

function writeExtended(records: ExtendedTelemetryRecord[]): void {
  writeStorage(STORAGE_KEYS.aiRuntimeTelemetryV2, records.slice(0, 2000));
}

export function recordExtendedTelemetry(
  params: Omit<ExtendedTelemetryRecord, "id" | "timestamp">
): ExtendedTelemetryRecord {
  const record: ExtendedTelemetryRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  };
  const records = readExtended();
  records.unshift(record);
  writeExtended(records);
  return record;
}

export function getExtendedTelemetry(): ExtendedTelemetryRecord[] {
  return readExtended();
}

export function getTelemetrySummary() {
  const records = readExtended();
  const totalCost = records.reduce((s, r) => s + r.costEstimate, 0);
  const totalTokens = records.reduce((s, r) => s + r.promptTokens + r.completionTokens, 0);
  const fallbacks = records.filter((r) => r.fallbackUsed).length;
  const errors = records.filter((r) => r.error).length;
  const avgLatency =
    records.length > 0 ? records.reduce((s, r) => s + r.latencyMs, 0) / records.length : 0;

  return {
    requestCount: records.length,
    totalCost,
    totalTokens,
    fallbacks,
    errors,
    avgLatencyMs: Math.round(avgLatency),
    cacheHits: records.filter((r) => r.cacheHit).length,
  };
}

/** Re-export base telemetry from RC3 */
export {
  recordAIRuntimeTelemetry,
  getAIRuntimeTelemetry,
  getAIRuntimeRoutingLog,
} from "./recorder";
