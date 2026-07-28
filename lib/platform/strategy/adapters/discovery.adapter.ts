/** Strategy pillar adapter → @/lib/discovery (type-only bridge). */

import type {
  DiscoveryContext,
  DiscoveryResult,
  DiscoveryAnswerMap,
} from "@/lib/discovery";

export type { DiscoveryContext, DiscoveryResult, DiscoveryAnswerMap };

export const discoveryAdapter = {
  readonly: true,
  module: "discovery",
  pillarId: "strategy" as const,

  /** Stub — runtime reads deferred to app layer (SSR-safe). */
  isAvailable(): boolean {
    return true;
  },

  async listModules(): Promise<string[]> {
    return ["discovery-answers", "idea-classifier", "question-generator", "discovery-score"];
  },
} as const;
