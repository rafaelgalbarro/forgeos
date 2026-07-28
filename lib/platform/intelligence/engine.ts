/** Intelligence pillar engine — scaffold implementation. */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, stubAsync } from "../shared/helpers";
import { intelligenceLayerAdapter } from "./adapters/intelligence-layer.adapter";
import { listIntelligenceCapabilities } from "./registry";
import type { IntelligenceSnapshot } from "./types";

export class IntelligencePillarEngine implements PillarEngine {
  readonly id = "intelligence" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listIntelligenceCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "Intelligence pillar scaffold — intelligence-layer adapter.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<IntelligenceSnapshot> {
    const engines = await intelligenceLayerAdapter.listEngines();
    return {
      ventureId,
      modules: engines,
      memorySynced: false,
      updatedAt: nowIso(),
    };
  }
}

export const intelligencePillarEngine = new IntelligencePillarEngine();
