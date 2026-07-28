/** ForgeOS AI Runtime — shared memory (RC3). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { AITask } from "@/lib/ai-gateway/types";
import type { RuntimeProviderId } from "../types";

export interface RuntimeMemoryRecord {
  id: string;
  timestamp: string;
  task: AITask;
  provider: RuntimeProviderId;
  model: string;
  ventureId?: string;
  inputPreview: string;
  outputPreview: string;
  sharedLayers: string[];
}

function readRuntimeMemory(): RuntimeMemoryRecord[] {
  return readStorage<RuntimeMemoryRecord[]>(STORAGE_KEYS.aiRuntimeMemory, []);
}

function writeRuntimeMemoryRecords(records: RuntimeMemoryRecord[]): void {
  writeStorage(STORAGE_KEYS.aiRuntimeMemory, records.slice(0, 500));
}

const SHARED_LAYERS = [
  "knowledge",
  "timeline",
  "memory",
  "decision-graph",
  "build-context",
  "build-dna",
  "runtime-history",
];

export function writeSharedMemory(params: {
  task: AITask;
  provider: RuntimeProviderId;
  model: string;
  ventureId?: string;
  system: string;
  user: string;
  output: string;
  latencyMs: number;
  costEstimate: number;
  fallbackUsed: boolean;
  decisionId?: string;
}): { memoryId: string } {
  const memory: RuntimeMemoryRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    task: params.task,
    provider: params.provider,
    model: params.model,
    ventureId: params.ventureId,
    inputPreview: params.user.slice(0, 240),
    outputPreview: params.output.slice(0, 240),
    sharedLayers: SHARED_LAYERS,
  };

  const records = readRuntimeMemory();
  records.unshift(memory);
  writeRuntimeMemoryRecords(records);

  return { memoryId: memory.id };
}

export function getRuntimeMemoryRecords(): RuntimeMemoryRecord[] {
  return readRuntimeMemory();
}
