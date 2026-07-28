/** Studio pillar adapter → @/lib/portfolio (read types). */

import type { PortfolioMetric, VenturePortfolioCard } from "@/lib/portfolio/types";

export type { PortfolioMetric, VenturePortfolioCard };

export const portfolioAdapter = {
  readonly: true,
  module: "portfolio",
  pillarId: "studio" as const,

  isAvailable(): boolean {
    return true;
  },

  async listMetricIds(): Promise<string[]> {
    return ["active-ventures", "pipeline-health", "next-actions"];
  },
} as const;
