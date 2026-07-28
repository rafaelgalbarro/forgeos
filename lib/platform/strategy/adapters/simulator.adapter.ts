/** Strategy pillar adapter → @/lib/venture-simulator (type-only bridge). */

import type {
  VentureSimulatorInput,
  VentureSimulatorResult,
  VentureSimulatorOverrides,
} from "@/lib/venture-simulator";

export type { VentureSimulatorInput, VentureSimulatorResult, VentureSimulatorOverrides };

export const simulatorAdapter = {
  readonly: true,
  module: "venture-simulator",
  pillarId: "strategy" as const,

  isAvailable(): boolean {
    return true;
  },

  async listScenarios(): Promise<string[]> {
    return ["conservative", "base", "optimistic"];
  },
} as const;
