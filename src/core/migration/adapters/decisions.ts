/**
 * Flow C — Decisions adapter (DUAL_WRITE).
 */

import { dualReadService } from "../dual-read";
import { dualWriteService } from "../dual-write";
import type { DualReadResult, DualWriteResult } from "../types";

export interface DecisionDto {
  id: string;
  missionId: string;
  status: "pending" | "resolved" | "cancelled";
  title: string;
  resolution?: string;
  updatedAt: string;
}

export function compareDecisions(a: DecisionDto, b: DecisionDto): string | null {
  if (a.id !== b.id) return `id_mismatch`;
  if (a.status !== b.status) return `status_mismatch: ${a.status} vs ${b.status}`;
  if ((a.resolution ?? "") !== (b.resolution ?? "")) return `resolution_mismatch`;
  return null;
}

export async function dualReadDecision(opts: {
  id: string;
  getV2: (id: string) => Promise<DecisionDto | null> | DecisionDto | null;
  getLegacy: (id: string) => Promise<DecisionDto | null> | DecisionDto | null;
  forceDual?: boolean;
}): Promise<DualReadResult<DecisionDto>> {
  return dualReadService.read({
    component: "decisions",
    forceDual: opts.forceDual,
    readV2: () => opts.getV2(opts.id),
    readLegacy: () => opts.getLegacy(opts.id),
    compare: compareDecisions,
    summarize: (d) => `${d.id}:${d.status}`,
  });
}

export async function dualWriteDecision(opts: {
  decision: DecisionDto;
  writeV2: (d: DecisionDto) => Promise<void> | void;
  writeLegacy: (d: DecisionDto) => Promise<void> | void;
  forceDual?: boolean;
}): Promise<DualWriteResult> {
  return dualWriteService.write({
    component: "decisions",
    forceDual: opts.forceDual,
    writeV2: () => opts.writeV2(opts.decision),
    writeLegacy: () => opts.writeLegacy(opts.decision),
    repair: () => opts.writeLegacy(opts.decision),
  });
}

export function createDecisionMemoryStores() {
  const legacy = new Map<string, DecisionDto>();
  const v2 = new Map<string, DecisionDto>();
  return {
    legacy,
    v2,
    getLegacy: (id: string) => legacy.get(id) ?? null,
    getV2: (id: string) => v2.get(id) ?? null,
    writeLegacy: (d: DecisionDto) => {
      legacy.set(d.id, d);
    },
    writeV2: (d: DecisionDto) => {
      v2.set(d.id, d);
    },
  };
}
