/** Executive Intelligence Mesh — Department Scores (RC3.5). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import { MESH_DEPARTMENTS } from "../departments";
import type { ExecutiveScore, MeshDepartmentId } from "../types";

function readScores(): ExecutiveScore[] {
  return readStorage<ExecutiveScore[]>(STORAGE_KEYS.executiveMeshScores, []);
}

function writeScores(scores: ExecutiveScore[]): void {
  writeStorage(STORAGE_KEYS.executiveMeshScores, scores);
}

function seedScore(deptId: MeshDepartmentId): ExecutiveScore {
  const dept = MESH_DEPARTMENTS.find((d) => d.id === deptId)!;
  const hash = deptId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    departmentId: deptId,
    confidence: 0.7 + (hash % 20) / 100,
    historicalAccuracy: 0.65 + (hash % 25) / 100,
    costIndex: dept.boardSeat ? 0.8 : 0.5,
    latencyMs: 800 + (hash % 1200),
    specialty: dept.specialties.join(", "),
    workload: 0.3 + (hash % 50) / 100,
    participation: dept.boardSeat ? 0.85 : 0.55,
    quality: 0.72 + (hash % 18) / 100,
    updatedAt: new Date().toISOString(),
  };
}

export function getExecutiveScores(): ExecutiveScore[] {
  const stored = readScores();
  if (stored.length >= MESH_DEPARTMENTS.length) return stored;

  const seeded = MESH_DEPARTMENTS.map((d) => {
    const existing = stored.find((s) => s.departmentId === d.id);
    return existing ?? seedScore(d.id);
  });
  writeScores(seeded);
  return seeded;
}

export function updateScoreAfterParticipation(
  departmentId: MeshDepartmentId,
  delta: { confidence?: number; participation?: number; quality?: number }
): ExecutiveScore {
  const scores = getExecutiveScores();
  const idx = scores.findIndex((s) => s.departmentId === departmentId);
  const current = idx >= 0 ? scores[idx]! : seedScore(departmentId);

  const updated: ExecutiveScore = {
    ...current,
    confidence: Math.min(1, current.confidence + (delta.confidence ?? 0.01)),
    participation: Math.min(1, current.participation + (delta.participation ?? 0.02)),
    quality: Math.min(1, current.quality + (delta.quality ?? 0.01)),
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) scores[idx] = updated;
  else scores.push(updated);
  writeScores(scores);
  return updated;
}

export function rankDepartmentsByScore(): ExecutiveScore[] {
  return [...getExecutiveScores()].sort(
    (a, b) =>
      b.confidence * 0.3 +
      b.quality * 0.3 +
      b.historicalAccuracy * 0.2 +
      b.participation * 0.2 -
      (a.confidence * 0.3 + a.quality * 0.3 + a.historicalAccuracy * 0.2 + a.participation * 0.2)
  );
}
