/**
 * Investment dashboard snapshot contracts — ANALYSIS_ONLY, no order path.
 * Browser-safe types only.
 */

export type InvestmentHealthState =
  | "CONNECTED"
  | "DISCONNECTED"
  | "STALE"
  | "PARTIAL"
  | "UNAVAILABLE"
  | "ERROR"
  | "IDLE"
  | "READY"
  | "ACTIVE";

export type InvestmentDataSourceLabel = "IBKR_LIVE_READ_ONLY" | "DEMO" | "CACHE" | "UNAVAILABLE";

/**
 * IBKR_LIVE_READ_ONLY only when the broker session is actually connected.
 * Disconnected / FastAPI-up-but-TWS-down must not be labeled LIVE.
 */
export function brokerDataSourceForConnection(connected: boolean): InvestmentDataSourceLabel {
  return connected ? "IBKR_LIVE_READ_ONLY" : "UNAVAILABLE";
}

/** Display honesty: never surface LIVE labels while disconnected. */
export function honestBrokerDataSource(
  dataSource: InvestmentDataSourceLabel | undefined,
  connected: boolean,
): InvestmentDataSourceLabel {
  if (!connected && (dataSource === "IBKR_LIVE_READ_ONLY" || !dataSource)) {
    return "UNAVAILABLE";
  }
  return dataSource ?? "UNAVAILABLE";
}

export interface SnapshotSectionMeta {
  readonly state: InvestmentHealthState;
  readonly updatedAt: string | null;
  readonly stale: boolean;
  readonly error?: string;
  readonly source?: "live" | "cache" | "fallback" | "synthetic";
  /** Explicit provenance — never mix DEMO with live IBKR rows. */
  readonly dataSource?: InvestmentDataSourceLabel;
}

export interface BrokerStatusSummary {
  readonly connected: boolean;
  readonly nextOrderIdReady?: boolean;
  readonly managedAccounts?: readonly string[];
  /** Masked account ids for UI display. */
  readonly maskedAccounts?: readonly string[];
  readonly ibkrReadOnly?: boolean;
  readonly liveTradingEnabled?: boolean;
  readonly engine?: string;
  readonly dataSource?: InvestmentDataSourceLabel;
}

export interface AccountSummarySnapshot {
  readonly netLiquidation?: number;
  readonly totalCashValue?: number;
  readonly buyingPower?: number;
  readonly currency?: string;
  readonly accountIds?: readonly string[];
  readonly rawTagCount?: number;
  readonly primaryAccountId?: string;
  readonly tradingCashValue?: number;
  readonly combinedCashValue?: number;
}

export interface PortfolioSummarySnapshot {
  readonly totalValue?: number;
  readonly baseCurrency?: string;
  readonly cashRatioPct?: number;
  readonly positionCount?: number;
  readonly openOrderCount?: number;
}

export interface RiskSummarySnapshot {
  readonly level?: string;
  readonly concentrationRiskPct?: number;
  readonly liquidityRiskPct?: number;
  readonly expectedDrawdownPct?: number;
  readonly factors?: readonly string[];
}

export interface CommitteeSummarySnapshot {
  readonly recommendation?: string;
  readonly confidence?: number;
  readonly reasoning?: readonly string[];
  readonly status?: string;
}

export interface ProviderStatusSnapshot {
  readonly marketProviderStatus: string;
  readonly providers?: ReadonlyArray<{ readonly id: string; readonly state: InvestmentHealthState }>;
}

export interface SignalSummaryItem {
  readonly name?: string;
  readonly direction?: string;
  readonly strength?: number;
  readonly timeframe?: string;
}

export interface RuntimeHealthSnapshot {
  readonly monitorRunning?: boolean;
  readonly evaluationCount?: number;
  readonly lastEvaluatedAt?: string | null;
  readonly note?: string;
}

export interface RecentDecisionItem {
  readonly label: string;
  readonly at?: string;
}

export interface InvestmentDashboardSnapshot {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY" | "LIVE";
  readonly orderExecution: "disabled" | "enabled";
  readonly liveTradingEnabled: boolean;
  readonly ibkrReadOnly: boolean;
  readonly forexEnabled: boolean;
  readonly tradingMode: string;
  readonly brokerStatus: SnapshotSectionMeta & { readonly data: BrokerStatusSummary | null };
  readonly accountSummary: SnapshotSectionMeta & { readonly data: AccountSummarySnapshot | null };
  readonly portfolioSummary: SnapshotSectionMeta & { readonly data: PortfolioSummarySnapshot | null };
  readonly riskSummary: SnapshotSectionMeta & { readonly data: RiskSummarySnapshot | null };
  readonly committeeSummary: SnapshotSectionMeta & { readonly data: CommitteeSummarySnapshot | null };
  readonly providerStatus: SnapshotSectionMeta & { readonly data: ProviderStatusSnapshot | null };
  readonly recentSignals: SnapshotSectionMeta & { readonly data: readonly SignalSummaryItem[] };
  readonly runtimeHealth: SnapshotSectionMeta & { readonly data: RuntimeHealthSnapshot | null };
  readonly recentDecisions: SnapshotSectionMeta & { readonly data: readonly RecentDecisionItem[] };
  readonly brainStatus: SnapshotSectionMeta & { readonly data: { readonly status: string } };
}

export const DASHBOARD_TTL_MS = {
  broker: 5_000,
  account: 10_000,
  positions: 10_000,
  risk: 30_000,
  analytics: 30_000,
  committee: 60_000,
  provider: 30_000,
  memory: 60_000,
  runtime: 10_000,
} as const;

export const DASHBOARD_TIMEOUT_MS = {
  brokerStatus: 2_000,
  account: 4_000,
  positions: 4_000,
  orders: 4_000,
  meta: 1_500,
  monitor: 3_000,
} as const;

export const DASHBOARD_POLL_MS = {
  broker: 5_000,
  account: 10_000,
  positions: 10_000,
  risk: 30_000,
  committee: 60_000,
  dashboard: 10_000,
} as const;
