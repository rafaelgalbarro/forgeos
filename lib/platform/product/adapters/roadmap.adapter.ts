/** Product pillar adapter → @/lib/ai (roadmap types). */

import type { ProductPRDRoadmap } from "@/lib/ai/types/product";

export type { ProductPRDRoadmap };

export const roadmapAdapter = {
  readonly: true,
  module: "roadmap",
  pillarId: "product" as const,

  isAvailable(): boolean {
    return true;
  },

  async listPhases(): Promise<string[]> {
    return ["mvp", "v1", "v2", "scale"];
  },
} as const;
