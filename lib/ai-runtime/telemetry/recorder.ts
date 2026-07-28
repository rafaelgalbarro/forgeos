/** ForgeOS AI Runtime — telemetry recorder (RC3). */

import { registerExecutiveObservation } from "@/lib/ai-orchestration/observability";
import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { AIRuntimeTelemetryRecord, RoutingDecision, RuntimeProviderId } from "../types";
import type { AITask } from "@/lib/ai-gateway/types";

function readTelemetry(): AIRuntimeTelemetryRecord[] {
  return readStorage<AIRuntimeTelemetryRecord[]>(STORAGE_KEYS.aiRuntimeTelemetry, []);
}

function writeTelemetry(records: AIRuntimeTelemetryRecord[]): void {
  writeStorage(STORAGE_KEYS.aiRuntimeTelemetry, records.slice(0, 1000));
}

function readRoutingLog(): RoutingDecision[] {
  return readStorage<RoutingDecision[]>(STORAGE_KEYS.aiRuntimeRouting, []);
}

function writeRoutingLog(decisions: RoutingDecision[]): void {
  writeStorage(STORAGE_KEYS.aiRuntimeRouting, decisions.slice(0, 500));
}

export function recordAIRuntimeTelemetry(params: {
  task: AITask;
  provider: RuntimeProviderId;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  fallbackUsed: boolean;
  error?: string;
  ventureId?: string;
  decisionId?: string;
  routing: RoutingDecision;
  qualityScore?: number;
  confidence?: number;
}): AIRuntimeTelemetryRecord {
  const record: AIRuntimeTelemetryRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    task: params.task,
    provider: params.provider,
    model: params.model,
    latencyMs: params.latencyMs,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    costEstimate: params.costEstimate,
    fallbackUsed: params.fallbackUsed,
    error: params.error,
    qualityScore: params.qualityScore ?? (params.fallbackUsed ? 0.5 : 0.85),
    confidence: params.confidence ?? (params.fallbackUsed ? 0.6 : 0.9),
    ventureId: params.ventureId,
    decisionId: params.decisionId,
    routingRationale: params.routing.rationale,
  };

  const records = readTelemetry();
  records.unshift(record);
  writeTelemetry(records);

  const routingLog = readRoutingLog();
  routingLog.unshift(params.routing);
  writeRoutingLog(routingLog);

  registerExecutiveObservation({
    task: params.task as never,
    provider: params.provider as never,
    model: params.model,
    latencyMs: params.latencyMs,
    estimatedTokens: params.inputTokens + params.outputTokens,
    costEstimate: params.costEstimate,
    fallbackUsed: params.fallbackUsed,
    warnings: params.error ? [params.error] : [],
    ventureId: params.ventureId,
    decisionId: params.decisionId,
  });

  return record;
}

export function getAIRuntimeTelemetry(): AIRuntimeTelemetryRecord[] {
  return readTelemetry();
}

export function getAIRuntimeRoutingLog(): RoutingDecision[] {
  return readRoutingLog();
}
