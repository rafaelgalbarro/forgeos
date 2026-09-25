import type { InvestmentReportViewModel } from "@/src/core/investment/presentation/dto";

export interface InvestmentWorkspaceReadModel {
  readonly mode?: "ANALYSIS_ONLY";
  readonly brainStatus?: string;
  readonly committeeStatus?: string;
  readonly marketProviderStatus?: string;
  readonly latestAnalyses?: readonly string[];
  readonly detectedRisks?: readonly string[];
  readonly report?: InvestmentReportViewModel;
  readonly marketSnapshot?: {
    readonly regime?: string;
    readonly volatilityIndex?: number;
    readonly liquidityIndex?: number;
    readonly breadthIndex?: number;
    readonly macroSignals?: readonly string[];
  };
  readonly portfolioSnapshot?: {
    readonly baseCurrency?: string;
    readonly totalValue?: number;
    readonly cashRatioPct?: number;
  };
  readonly signals?: ReadonlyArray<{
    readonly name?: string;
    readonly direction?: string;
    readonly strength?: number;
    readonly timeframe?: string;
  }>;
  readonly news?: ReadonlyArray<{
    readonly headline?: string;
    readonly source?: string;
    readonly sentiment?: string;
  }>;
  readonly watchlists?: ReadonlyArray<{
    readonly name?: string;
    readonly size?: number;
  }>;
  readonly economicCalendar?: ReadonlyArray<{
    readonly event?: string;
    readonly region?: string;
    readonly impact?: string;
  }>;
  readonly orders?: ReadonlyArray<{
    readonly symbol?: string;
    readonly side?: string;
    readonly size?: number;
    readonly status?: string;
  }>;
  readonly performance?: {
    readonly periodReturnPct?: number;
    readonly volatilityPct?: number;
    readonly sharpe?: number;
  };
  readonly allocation?: {
    readonly targetCashPct?: number;
    readonly targetEquityPct?: number;
    readonly targetDefensivePct?: number;
  };
  readonly heatmaps?: ReadonlyArray<{
    readonly name?: string;
    readonly updatedAt?: string;
  }>;
}

export interface InvestmentPanelDefinition {
  readonly id: string;
  readonly title: string;
  readonly readOnly?: boolean;
}

export const INVESTMENT_PANELS: readonly InvestmentPanelDefinition[] = [
  { id: "dashboard", title: "Dashboard" },
  { id: "markets", title: "Markets" },
  { id: "opportunities", title: "Opportunities" },
  { id: "portfolio", title: "Portfolio" },
  { id: "orders", title: "Orders (read-only)", readOnly: true },
  { id: "strategies", title: "Strategies" },
  { id: "risk", title: "Risk" },
  { id: "news", title: "News" },
  { id: "calendar", title: "Calendar" },
  { id: "ai-committee", title: "AI Committee" },
  { id: "reports", title: "Reports" },
  { id: "settings", title: "Settings" },
  { id: "signals", title: "Signals" },
  { id: "committee", title: "Investment Committee" },
  { id: "macro", title: "Macro" },
  { id: "performance", title: "Performance" },
  { id: "allocation", title: "Allocation" },
  { id: "heatmaps", title: "Heatmaps" },
  { id: "watchlists", title: "Watchlists" },
  { id: "economic-calendar", title: "Calendario económico" },
] as const;
