import { assertNonEmpty, assertSerializable } from "../domain/guards";
import type { MetricValue, PortfolioAnalyticsSnapshot } from "../domain/portfolio-analytics";

export type MonitorAlertCategory =
  | "PortfolioAlerts"
  | "RiskAlerts"
  | "OpportunityAlerts"
  | "AllocationAlerts";

export type MonitorAlertSeverity = "INFO" | "WARN" | "CRITICAL";

export type MonitorAlertCode =
  | "RISING_RISK"
  | "DRAWDOWN"
  | "CONCENTRATION"
  | "DUPLICATE_POSITION"
  | "DOMINANT_POSITION"
  | "DANGEROUS_CORRELATION"
  | "LIQUIDITY_CHANGE"
  | "SECTOR_CONCENTRATION"
  | "COUNTRY_CONCENTRATION"
  | "CURRENCY_EXPOSURE"
  | "CASH_LOW"
  | "BETA_ELEVATED"
  | "EXPOSURE_HIGH"
  | "PNL_PRESSURE"
  | "REBALANCE_OPPORTUNITY"
  | "DIVERSIFICATION_GAP";

export interface PortfolioMonitorAlert {
  readonly id: string;
  readonly category: MonitorAlertCategory;
  readonly code: MonitorAlertCode;
  readonly severity: MonitorAlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly metric: string | null;
  readonly value: number | null;
  readonly threshold: number | null;
  readonly symbols: readonly string[];
  readonly detectedAt: string;
  readonly evidence: readonly string[];
}

export interface PortfolioMonitorObservation {
  readonly asOf: string;
  readonly baseCurrency: string;
  readonly positionCount: number;
  readonly symbols: readonly string[];
  readonly cash: MetricValue;
  readonly capitalInvested: MetricValue;
  readonly pnlProxy: MetricValue;
  readonly drawdown: MetricValue;
  readonly beta: MetricValue;
  readonly correlations: MetricValue;
  readonly concentration: MetricValue;
  readonly diversification: MetricValue;
  readonly exposure: MetricValue;
  readonly totalRisk: MetricValue;
  readonly volatility: MetricValue;
  readonly returns: MetricValue;
  readonly topSector: string | null;
  readonly topCountry: string | null;
  readonly topCurrency: string | null;
  readonly topPositionWeightPct: number | null;
}

export interface PortfolioMonitorPolicy {
  readonly maxDrawdownPct: number;
  readonly maxConcentrationPct: number;
  readonly maxDominantPositionPct: number;
  readonly maxCorrelation: number;
  readonly maxBeta: number;
  readonly minCashPct: number;
  readonly maxSectorWeightPct: number;
  readonly maxCountryWeightPct: number;
  readonly maxCurrencyWeightPct: number;
  readonly maxExposurePct: number;
  readonly risingRiskDelta: number;
  readonly liquidityChangePct: number;
  readonly dedupeTtlMs: number;
  readonly maxAlertsRetained: number;
}

export interface PortfolioMonitorSnapshot {
  readonly monitorStartedAt: string | null;
  readonly monitorRunning: boolean;
  readonly evaluationCount: number;
  readonly lastEvaluatedAt: string | null;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly observation: PortfolioMonitorObservation | null;
  readonly alerts: readonly PortfolioMonitorAlert[];
  readonly alertsByCategory: Readonly<Record<MonitorAlertCategory, readonly PortfolioMonitorAlert[]>>;
  readonly analyticsAsOf: string | null;
}

export function defaultPortfolioMonitorPolicy(): PortfolioMonitorPolicy {
  return {
    maxDrawdownPct: 10,
    maxConcentrationPct: 35,
    maxDominantPositionPct: 20,
    maxCorrelation: 0.85,
    maxBeta: 1.5,
    minCashPct: 5,
    maxSectorWeightPct: 40,
    maxCountryWeightPct: 60,
    maxCurrencyWeightPct: 80,
    maxExposurePct: 120,
    risingRiskDelta: 5,
    liquidityChangePct: 15,
    dedupeTtlMs: 120_000,
    maxAlertsRetained: 200,
  };
}

export function emptyAlertsByCategory(): Record<MonitorAlertCategory, PortfolioMonitorAlert[]> {
  return {
    PortfolioAlerts: [],
    RiskAlerts: [],
    OpportunityAlerts: [],
    AllocationAlerts: [],
  };
}

export function groupAlertsByCategory(
  alerts: readonly PortfolioMonitorAlert[],
): Readonly<Record<MonitorAlertCategory, readonly PortfolioMonitorAlert[]>> {
  const grouped = emptyAlertsByCategory();
  for (const alert of alerts) {
    grouped[alert.category].push(alert);
  }
  return grouped;
}

export function buildObservationFromAnalytics(
  analytics: PortfolioAnalyticsSnapshot,
): PortfolioMonitorObservation {
  const topSector = analytics.bySector[0]?.label ?? null;
  const topCountry = analytics.byCountry[0]?.label ?? null;
  const topCurrency = analytics.byCurrency[0]?.label ?? null;
  const topWeight = analytics.byPosition[0]?.weightPct.value ?? null;
  const invested = analytics.capitalInvested.value;
  const returnsPct = analytics.returns.value;
  const pnlProxy: MetricValue =
    invested != null && returnsPct != null
      ? {
          status: "ESTIMATED",
          value: (invested * returnsPct) / 100,
          unit: "CURRENCY",
          note: "Proxy PnL from capital invested × period return",
        }
      : { status: "NOT_MEASURED", value: null, unit: "CURRENCY", note: "PnL proxy unavailable" };

  return {
    asOf: analytics.asOf,
    baseCurrency: analytics.baseCurrency,
    positionCount: analytics.byPosition.length,
    symbols: analytics.byPosition.map((row) => row.label),
    cash: analytics.cash,
    capitalInvested: analytics.capitalInvested,
    pnlProxy,
    drawdown: analytics.drawdown,
    beta: analytics.beta,
    correlations: analytics.correlations,
    concentration: analytics.concentration,
    diversification: analytics.diversification,
    exposure: analytics.exposure,
    totalRisk: analytics.totalRisk,
    volatility: analytics.volatility,
    returns: analytics.returns,
    topSector,
    topCountry,
    topCurrency,
    topPositionWeightPct: topWeight,
  };
}

export function ensurePortfolioMonitorAlert(alert: PortfolioMonitorAlert): PortfolioMonitorAlert {
  assertNonEmpty(alert.id, "PortfolioMonitorAlert.id");
  assertNonEmpty(alert.title, "PortfolioMonitorAlert.title");
  assertNonEmpty(alert.message, "PortfolioMonitorAlert.message");
  assertNonEmpty(alert.detectedAt, "PortfolioMonitorAlert.detectedAt");
  if (alert.evidence.length === 0) {
    throw new Error("PortfolioMonitorAlert.evidence cannot be empty");
  }
  assertSerializable(alert, "PortfolioMonitorAlert");
  return alert;
}

export function ensurePortfolioMonitorSnapshot(
  snapshot: PortfolioMonitorSnapshot,
): PortfolioMonitorSnapshot {
  assertSerializable(snapshot, "PortfolioMonitorSnapshot");
  return snapshot;
}
