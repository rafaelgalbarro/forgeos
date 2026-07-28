/**
 * PROGRAM 6100 — Performance budgets (measured, not aspirational).
 */

export interface PerformanceBudgets {
  /** Initial navigation TTFB + shell paint target (local dev). */
  initialNavigationMs: number;
  /** Cached read model query target. */
  cachedReadModelMs: number;
  /** Max dashboard JSON payload size. */
  dashboardPayloadBytes: number;
  /** Target JS bundle reduction from baseline (%). */
  jsReductionPercent: number;
  /** Max concurrent preview sandboxes per workspace. */
  maxPreviewSandboxes: number;
  /** Max concurrent workflows per venture. */
  maxWorkflowsPerVenture: number;
  /** Max portfolio cards per page. */
  maxPortfolioCardsPerPage: number;
  /** Query latency warning threshold. */
  queryLatencyWarnMs: number;
  /** Composition root cold init warning. */
  compositionRootColdInitMs: number;
  /** Memory growth warning (MB). */
  memoryGrowthWarnMb: number;
}

export const PERFORMANCE_BUDGETS: PerformanceBudgets = {
  initialNavigationMs: 2500,
  cachedReadModelMs: 300,
  dashboardPayloadBytes: 250 * 1024,
  jsReductionPercent: 30,
  maxPreviewSandboxes: 3,
  maxWorkflowsPerVenture: 5,
  maxPortfolioCardsPerPage: 50,
  queryLatencyWarnMs: 500,
  compositionRootColdInitMs: 1500,
  memoryGrowthWarnMb: 256,
};

/** Regression tolerances for budget checks. */
export const REGRESSION_TOLERANCES = {
  routeLatencyPercent: 15,
  bundleSizePercent: 10,
  queryLatencyPercent: 20,
  payloadSizePercent: 15,
  memoryPercent: 25,
} as const;
