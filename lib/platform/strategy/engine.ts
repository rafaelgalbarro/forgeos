/** Strategy pillar engine — scaffold implementation. */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, emptyArray, stubAsync } from "../shared/helpers";
import { discoveryAdapter } from "./adapters/discovery.adapter";
import { founderAdvisorAdapter } from "./adapters/founder-advisor.adapter";
import { researchAdapter } from "./adapters/research.adapter";
import { simulatorAdapter } from "./adapters/simulator.adapter";
import { listStrategyCapabilities } from "./registry";
import type { StrategySnapshot } from "./types";

export class StrategyPillarEngine implements PillarEngine {
  readonly id = "strategy" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listStrategyCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "Strategy pillar scaffold — adapters registered, not connected.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<StrategySnapshot> {
    const modules = [
      discoveryAdapter.module,
      founderAdvisorAdapter.module,
      researchAdapter.module,
      simulatorAdapter.module,
    ];
    return { ventureId, modules, updatedAt: nowIso() };
  }

  async listAdapters(): Promise<string[]> {
    return emptyArray<string>().concat([
      discoveryAdapter.module,
      founderAdvisorAdapter.module,
      researchAdapter.module,
      simulatorAdapter.module,
    ]);
  }
}

export const strategyPillarEngine = new StrategyPillarEngine();
