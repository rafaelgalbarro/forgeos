/** Strategy pillar adapter → @/lib/intelligence/founder-advisor (type-only bridge). */

import type { FounderAdvisorOutput } from "@/lib/intelligence/types";

export type { FounderAdvisorOutput };

export const founderAdvisorAdapter = {
  readonly: true,
  module: "founder-advisor",
  pillarId: "strategy" as const,

  isAvailable(): boolean {
    return true;
  },

  async listCapabilities(): Promise<string[]> {
    return ["risk-analysis", "opportunity-mapping", "founder-questions"];
  },
} as const;
