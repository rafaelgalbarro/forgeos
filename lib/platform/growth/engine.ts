/** Growth pillar engine — scaffold implementation. */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, emptyArray, stubAsync } from "../shared/helpers";
import { listGrowthCapabilities } from "./registry";
import type { GrowthModuleId, GrowthSnapshot } from "./types";

export class GrowthPillarEngine implements PillarEngine {
  readonly id = "growth" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listGrowthCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "Growth pillar scaffold — metrics types defined.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<GrowthSnapshot> {
    return {
      ventureId,
      modules: listGrowthCapabilities().map((c) => c.id as GrowthModuleId),
      updatedAt: nowIso(),
    };
  }

  async listExperiments(_ventureId: VentureId): Promise<unknown[]> {
    return emptyArray();
  }
}

export const growthPillarEngine = new GrowthPillarEngine();
