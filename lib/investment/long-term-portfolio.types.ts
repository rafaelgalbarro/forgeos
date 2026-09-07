/**
 * Browser-safe contracts for Cartera Largo Plazo — ANALYSIS_ONLY.
 * Horizon: 6 months – 3 years. No order path.
 */

export const LONG_TERM_HORIZON_LABEL = "6 months – 3 years" as const;

export const VALUE_SCREEN_CRITERIA = {
  maxPE: 15,
  maxPB: 1.5,
  minRoePct: 15,
  maxDebtEquity: 0.5,
  minDividendRisingYears: 5,
} as const;

export type LongTermDataStatus = "OK" | "PARTIAL" | "NO_DATA" | "DISABLED";

export type ValueScreenerHit = {
  readonly ticker: string;
  readonly name: string;
  readonly sector: string;
  readonly pe: number | null;
  readonly pb: number | null;
  readonly roePct: number | null;
  readonly debtEquity: number | null;
  readonly passes: boolean;
  readonly missingFields: readonly string[];
  readonly note: string;
};

export type DividendGrowthRow = {
  readonly ticker: string;
  readonly name: string;
  readonly risingYears: number | null;
  readonly qualifies: boolean;
  readonly latestAnnualDividend: number | null;
  readonly status: LongTermDataStatus;
  readonly note: string;
};

export type RebalanceSuggestion = {
  readonly ticker: string;
  readonly action: "HOLD" | "TRIM" | "ADD" | "ROTATE_OUT" | "CANDIDATE";
  readonly currentWeightPct: number | null;
  readonly targetWeightPct: number | null;
  readonly rationale: string;
  readonly soft: true;
};

export type CatalystKind = "split" | "rating_change" | "buyback";

export type CatalystAlert = {
  readonly id: string;
  readonly ticker: string;
  readonly kind: CatalystKind;
  readonly severity: "info" | "watch";
  readonly title: string;
  readonly detail: string;
  readonly date: string | null;
  readonly status: LongTermDataStatus;
};

export type LongTermPortfolioSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly enabled: boolean;
  readonly horizon: typeof LONG_TERM_HORIZON_LABEL;
  readonly criteria: typeof VALUE_SCREEN_CRITERIA;
  readonly status: LongTermDataStatus;
  readonly note: string;
  readonly nextQuarterlyRebalance: string | null;
  readonly scannedCount: number;
  readonly valueScreener: readonly ValueScreenerHit[];
  readonly dividendGrowth: readonly DividendGrowthRow[];
  readonly rebalanceSuggestions: readonly RebalanceSuggestion[];
  readonly catalysts: readonly CatalystAlert[];
};
