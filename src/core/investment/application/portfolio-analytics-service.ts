import { computePortfolioAnalytics } from "./portfolio-analytics-engine";
import type { PortfolioAnalyticsSnapshot } from "../domain/portfolio-analytics";
import type { PortfolioAnalyticsDataProvider } from "../infrastructure/portfolio-analytics-provider";

export interface PortfolioAnalyticsService {
  analyze(): Promise<PortfolioAnalyticsSnapshot>;
}

export function createPortfolioAnalyticsService(
  provider: PortfolioAnalyticsDataProvider,
): PortfolioAnalyticsService {
  return {
    async analyze() {
      const input = await provider.loadSnapshot();
      return computePortfolioAnalytics(input);
    },
  };
}
