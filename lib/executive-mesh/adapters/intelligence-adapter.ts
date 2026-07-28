/** Executive Mesh — adapter to intelligence-layer (persistence only). */

import { registerDecision } from "@/lib/intelligence-layer/decision-engine";
import { recordVentureHistoryEvent } from "@/lib/intelligence-layer/history";
import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { MeshMemoryRecord } from "../types";

export function meshWriteDecision(params: {
  ventureId: string;
  title: string;
  rationale: string;
  recommendation: string;
  confidence: number;
}): string {
  const decision = registerDecision({
    ventureId: params.ventureId,
    title: params.title,
    description: params.recommendation,
    motive: params.rationale,
    takenBy: "executive-mesh",
    date: new Date().toISOString(),
    expectedImpact: params.recommendation,
    reversible: true,
    dependencies: [],
    status: "active",
  });
  return decision.id;
}

export function meshWriteTimelineEvent(params: {
  ventureId: string;
  title: string;
  description: string;
}): string {
  const event = recordVentureHistoryEvent({
    ventureId: params.ventureId,
    type: "executive",
    title: params.title,
    description: params.description,
    date: new Date().toISOString(),
    metadata: { source: "executive-mesh" },
  });
  return event.id;
}

function readMeshMemory(): MeshMemoryRecord[] {
  return readStorage<MeshMemoryRecord[]>(STORAGE_KEYS.executiveMeshSessions, []);
}

function writeMeshMemory(records: MeshMemoryRecord[]): void {
  writeStorage(STORAGE_KEYS.executiveMeshSessions, records.slice(0, 500));
}

export function meshPersistMemoryRecord(record: MeshMemoryRecord): MeshMemoryRecord {
  const records = readMeshMemory();
  records.unshift(record);
  writeMeshMemory(records);
  return record;
}

export function meshGetMemoryRecords(ventureId?: string): MeshMemoryRecord[] {
  const all = readMeshMemory();
  return ventureId ? all.filter((r) => r.ventureId === ventureId) : all;
}
