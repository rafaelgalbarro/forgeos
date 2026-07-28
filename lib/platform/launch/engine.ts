/** Launch pillar engine — scaffold implementation. */

import type { PillarEngine, VentureId, PillarHealthCheck } from "../shared/types";
import { nowIso, emptyArray, stubAsync } from "../shared/helpers";
import { listLaunchCapabilities } from "./registry";
import type { LaunchModuleId, LaunchSnapshot } from "./types";

export class LaunchPillarEngine implements PillarEngine {
  readonly id = "launch" as const;
  readonly status = "scaffold" as const;

  async initialize(_ventureId: VentureId): Promise<void> {
    await stubAsync(undefined);
  }

  getCapabilities(): string[] {
    return listLaunchCapabilities().map((c) => c.id);
  }

  async healthCheck(): Promise<PillarHealthCheck> {
    return {
      ok: true,
      message: "Launch pillar scaffold — GTM modules typed, not implemented.",
      checkedAt: nowIso(),
    };
  }

  async getSnapshot(ventureId: VentureId): Promise<LaunchSnapshot> {
    return {
      ventureId,
      modules: listLaunchCapabilities().map((c) => c.id as LaunchModuleId),
      readiness: 0,
      updatedAt: nowIso(),
    };
  }

  async listModulePlans(_ventureId: VentureId): Promise<LaunchModuleId[]> {
    return emptyArray<LaunchModuleId>().concat(
      listLaunchCapabilities().map((c) => c.id as LaunchModuleId),
    );
  }
}

export const launchPillarEngine = new LaunchPillarEngine();
