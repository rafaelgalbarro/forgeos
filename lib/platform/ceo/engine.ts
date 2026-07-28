/** CEO pillar engine — scaffold (no lib/ceo or lib/fos imports). */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, emptyArray, stubAsync } from "../shared/helpers";
import { listCeoCapabilities } from "./registry";
import type { CeoBriefingStub, CeoSnapshot } from "./types";

export class CeoPillarEngine implements PillarEngine {
  readonly id = "ceo" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listCeoCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "CEO pillar scaffold — adapters not connected to lib/ceo.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<CeoSnapshot> {
    return {
      ventureId,
      modules: listCeoCapabilities().map((c) => c.id),
      updatedAt: nowIso(),
    };
  }

  async buildBriefingStub(ventureId: VentureId): Promise<CeoBriefingStub> {
    return {
      ventureId,
      summary: "",
      priorities: emptyArray(),
      generatedAt: nowIso(),
    };
  }
}

export const ceoPillarEngine = new CeoPillarEngine();
