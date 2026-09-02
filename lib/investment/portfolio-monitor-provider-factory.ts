import {
  createIbkrPortfolioAnalyticsProvider,
  type PortfolioAnalyticsDataProvider,
} from "@/src/core/investment/infrastructure/portfolio-analytics-provider";
import { SyntheticPortfolioMonitorSnapshotProvider } from "@/src/core/investment/portfolio-monitor";

export type PortfolioMonitorDataLabel = "DEMO" | "IBKR_LIVE_READ_ONLY" | "NO_DATA";

export type ResolvedPortfolioMonitorProvider = {
  provider: PortfolioAnalyticsDataProvider;
  /** Preferred / configured label; may become DEMO after a failed IBKR load. */
  label: PortfolioMonitorDataLabel;
  note: string;
};

/**
 * Prefer read-only IBKR portfolio snapshots when internal API key is present.
 * On IBKR load failure, falls back to Synthetic DEMO for that evaluation — never invents IBKR prices.
 */
export function resolvePortfolioMonitorProvider(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedPortfolioMonitorProvider {
  const apiKey = env.IBKR_INTERNAL_API_KEY?.trim();
  if (!apiKey) {
    return {
      provider: new SyntheticPortfolioMonitorSnapshotProvider(),
      label: "DEMO",
      note: "DEMO synthetic portfolio monitor — IBKR_INTERNAL_API_KEY not set. Not live marks.",
    };
  }

  const resolved: ResolvedPortfolioMonitorProvider = {
    provider: null as unknown as PortfolioAnalyticsDataProvider,
    label: "IBKR_LIVE_READ_ONLY",
    note: "IBKR read-only positions/account — marketPrice null when quotes absent; ANALYSIS_ONLY.",
  };

  const ibkr = createIbkrPortfolioAnalyticsProvider();
  const demo = new SyntheticPortfolioMonitorSnapshotProvider();

  resolved.provider = {
    async loadSnapshot() {
      try {
        const snap = await ibkr.loadSnapshot();
        resolved.label = "IBKR_LIVE_READ_ONLY";
        resolved.note =
          "IBKR read-only positions/account — marketPrice null when quotes absent; ANALYSIS_ONLY.";
        return snap;
      } catch (error) {
        resolved.label = "DEMO";
        resolved.note =
          error instanceof Error
            ? `DEMO fallback — IBKR snapshot failed (${error.message})`
            : "DEMO fallback — IBKR snapshot failed";
        return demo.loadSnapshot();
      }
    },
  };

  return resolved;
}
