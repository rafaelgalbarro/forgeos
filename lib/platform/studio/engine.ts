/** Studio pillar engine — scaffold implementation. */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, stubAsync } from "../shared/helpers";
import { knowledgeAdapter } from "./adapters/knowledge.adapter";
import { portfolioAdapter } from "./adapters/portfolio.adapter";
import { listStudioCapabilities } from "./registry";
import type { StudioSnapshot } from "./types";

export class StudioPillarEngine implements PillarEngine {
  readonly id = "studio" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listStudioCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "Studio pillar scaffold — portfolio and knowledge adapters.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<StudioSnapshot> {
    const domains = await knowledgeAdapter.listDomains();
    return {
      ventureId,
      portfolioLinked: false,
      knowledgeDomains: domains,
      updatedAt: nowIso(),
    };
  }

  getPortfolioModule(): string {
    return portfolioAdapter.module;
  }
}

export const studioPillarEngine = new StudioPillarEngine();
