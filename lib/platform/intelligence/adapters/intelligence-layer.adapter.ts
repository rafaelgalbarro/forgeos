/** Intelligence pillar adapter → @/lib/intelligence-layer. */

import type {
  Decision,
  Pattern,
  Insight,
  Recommendation,
  VentureMemoryRecord,
} from "@/lib/intelligence-layer";

export type { Decision, Pattern, Insight, Recommendation, VentureMemoryRecord };

export const intelligenceLayerAdapter = {
  readonly: true,
  module: "intelligence-layer",
  pillarId: "intelligence" as const,

  isAvailable(): boolean {
    return true;
  },

  async listEngines(): Promise<string[]> {
    return [
      "decision-engine",
      "pattern-engine",
      "learning-engine",
      "venture-memory",
      "portfolio-memory",
      "ceo-memory",
    ];
  },
} as const;
