/** Capital pillar engine — scaffold implementation. */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, emptyArray, stubAsync } from "../shared/helpers";
import { listCapitalCapabilities } from "./registry";
import type { CapitalModuleId, CapitalSnapshot } from "./types";

export class CapitalPillarEngine implements PillarEngine {
  readonly id = "capital" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listCapitalCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "Capital pillar scaffold — fundraising types defined.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<CapitalSnapshot> {
    return {
      ventureId,
      modules: listCapitalCapabilities().map((c) => c.id as CapitalModuleId),
      fundraisingActive: false,
      updatedAt: nowIso(),
    };
  }

  async listDataRoomDocuments(_ventureId: VentureId): Promise<unknown[]> {
    return emptyArray();
  }
}

export const capitalPillarEngine = new CapitalPillarEngine();
