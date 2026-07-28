/**
 * Flow E — Outputs adapter (DUAL_READ).
 */

import { dualReadService } from "../dual-read";
import type { DualReadResult } from "../types";

export interface OutputDto {
  id: string;
  missionId: string;
  type: string;
  version: string;
  status: string;
  updatedAt: string;
}

export function compareOutputs(a: OutputDto, b: OutputDto): string | null {
  if (a.id !== b.id) return "id_mismatch";
  if (a.type !== b.type) return `type_mismatch: ${a.type} vs ${b.type}`;
  if (a.version !== b.version) return `version_mismatch: ${a.version} vs ${b.version}`;
  return null;
}

export async function dualReadOutput(opts: {
  id: string;
  getV2: (id: string) => Promise<OutputDto | null> | OutputDto | null;
  getLegacy: (id: string) => Promise<OutputDto | null> | OutputDto | null;
  forceDual?: boolean;
}): Promise<DualReadResult<OutputDto>> {
  return dualReadService.read({
    component: "outputs",
    forceDual: opts.forceDual,
    readV2: () => opts.getV2(opts.id),
    readLegacy: () => opts.getLegacy(opts.id),
    compare: compareOutputs,
    summarize: (o) => `${o.id}:${o.type}@${o.version}`,
  });
}

export function createOutputMemoryStores() {
  const legacy = new Map<string, OutputDto>();
  const v2 = new Map<string, OutputDto>();
  return {
    legacy,
    v2,
    getLegacy: (id: string) => legacy.get(id) ?? null,
    getV2: (id: string) => v2.get(id) ?? null,
    seedLegacy: (o: OutputDto) => legacy.set(o.id, o),
    seedV2: (o: OutputDto) => v2.set(o.id, o),
  };
}
