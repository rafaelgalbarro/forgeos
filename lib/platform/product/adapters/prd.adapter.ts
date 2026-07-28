/** Product pillar adapter → @/lib/ai (PRD types). */

import type { ProductPRD, ProductPRDRoadmap } from "@/lib/ai/types/product";

export type { ProductPRD, ProductPRDRoadmap };

export const prdAdapter = {
  readonly: true,
  module: "prd",
  pillarId: "product" as const,

  isAvailable(): boolean {
    return true;
  },

  async listSections(): Promise<string[]> {
    return ["problem", "solution", "mvp", "metrics", "risks"];
  },
} as const;
