/**
 * Flow A — Mission reads adapter (DUAL_READ).
 * Maps legacy Mission persistence ↔ V2 Mission aggregate shape (normalized DTO).
 */

import { dualReadService } from "../dual-read";
import type { DualReadResult } from "../types";

/** Normalized mission read DTO shared across dual-read. */
export interface MissionReadDto {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  sourceHint: "legacy" | "v2";
}

export type LegacyMissionLike = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  phase?: string;
  updatedAt?: string;
  createdAt?: string;
};

export type V2MissionLike = {
  id: string;
  status: string;
  intent?: { primary?: string; extractedIdea?: string } | null;
  updatedAt: string;
  createdAt?: string;
};

export function fromLegacyMission(m: LegacyMissionLike): MissionReadDto {
  return {
    id: m.id,
    title: m.title || m.name || m.id,
    status: String(m.status || m.phase || "unknown"),
    updatedAt: m.updatedAt || m.createdAt || new Date(0).toISOString(),
    sourceHint: "legacy",
  };
}

export function fromV2Mission(m: V2MissionLike): MissionReadDto {
  return {
    id: String(m.id),
    title: m.intent?.extractedIdea || m.intent?.primary || String(m.id),
    status: m.status,
    updatedAt: m.updatedAt || m.createdAt || new Date(0).toISOString(),
    sourceHint: "v2",
  };
}

export function compareMissionDtos(a: MissionReadDto, b: MissionReadDto): string | null {
  if (a.id !== b.id) return `id_mismatch: ${a.id} vs ${b.id}`;
  if (a.status !== b.status) return `status_mismatch: v2=${a.status} legacy=${b.status}`;
  return null;
}

/**
 * Dual-read a mission by id.
 * Callers inject store accessors so this module stays free of React / Next / localStorage coupling.
 */
export async function dualReadMission(opts: {
  id: string;
  getV2: (id: string) => Promise<V2MissionLike | null> | V2MissionLike | null;
  getLegacy: (id: string) => Promise<LegacyMissionLike | null> | LegacyMissionLike | null;
  forceDual?: boolean;
}): Promise<DualReadResult<MissionReadDto>> {
  return dualReadService.read({
    component: "mission.reads",
    forceDual: opts.forceDual,
    readV2: async () => {
      const m = await opts.getV2(opts.id);
      return m ? fromV2Mission(m) : null;
    },
    readLegacy: async () => {
      const m = await opts.getLegacy(opts.id);
      return m ? fromLegacyMission(m) : null;
    },
    compare: compareMissionDtos,
    summarize: (d) => `${d.id}:${d.status}`,
  });
}

/** In-memory stores for tests / dry-run. */
export function createMissionReadMemoryStores() {
  const legacy = new Map<string, LegacyMissionLike>();
  const v2 = new Map<string, V2MissionLike>();
  return {
    legacy,
    v2,
    getLegacy: (id: string) => legacy.get(id) ?? null,
    getV2: (id: string) => v2.get(id) ?? null,
    seedLegacy: (m: LegacyMissionLike) => legacy.set(m.id, m),
    seedV2: (m: V2MissionLike) => v2.set(String(m.id), m),
  };
}
