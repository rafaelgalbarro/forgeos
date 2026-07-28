/** Product pillar engine — scaffold implementation. */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, stubAsync } from "../shared/helpers";
import { prdAdapter } from "./adapters/prd.adapter";
import { roadmapAdapter } from "./adapters/roadmap.adapter";
import { uxAdapter } from "./adapters/ux.adapter";
import { listProductCapabilities } from "./registry";
import type { ProductSnapshot } from "./types";

export class ProductPillarEngine implements PillarEngine {
  readonly id = "product" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listProductCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "Product pillar scaffold — PRD/roadmap/UX adapters registered.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<ProductSnapshot> {
    return {
      ventureId,
      modules: [prdAdapter.module, roadmapAdapter.module, uxAdapter.module, "mvp"],
      hasPrd: false,
      updatedAt: nowIso(),
    };
  }
}

export const productPillarEngine = new ProductPillarEngine();
