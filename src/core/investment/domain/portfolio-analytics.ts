import { assertSerializable } from "./guards";

export type MetricStatus = "MEASURED" | "ESTIMATED" | "UNKNOWN" | "NOT_MEASURED";

export interface MetricValue {
  readonly status: MetricStatus;
  readonly value: number | null;
  readonly unit: "PCT" | "RATIO" | "CURRENCY" | "DAYS" | "COUNT" | "SCORE";
  readonly note?: string;
}

export interface PortfolioAnalyticsPosition {
  readonly symbol: string;
  readonly quantity: number;
  readonly averageCost: number;
  readonly marketPrice: number | null;
  readonly currency: string;
  readonly sector: string;
  readonly industry: string;
  readonly country: string;
  readonly beta: number | null;
  readonly returnsSeries: readonly number[];
}

export interface PortfolioAnalyticsInput {
  readonly asOf: string;
  readonly baseCurrency: string;
  readonly positions: readonly PortfolioAnalyticsPosition[];
  readonly cash: number | null;
  readonly benchmarkReturns: readonly number[];
  readonly portfolioReturns: readonly number[];
  readonly riskFreeRate: number | null;
}

export interface RiskBreakdownRow {
  readonly key: string;
  readonly label: string;
  readonly weightPct: MetricValue;
  readonly riskPct: MetricValue;
  readonly exposure: MetricValue;
}

export interface PortfolioAnalyticsSnapshot {
  readonly generatedAt: string;
  readonly asOf: string;
  readonly baseCurrency: string;
  readonly returns: MetricValue;
  readonly drawdown: MetricValue;
  readonly volatility: MetricValue;
  readonly sharpe: MetricValue;
  readonly sortino: MetricValue;
  readonly beta: MetricValue;
  readonly correlations: MetricValue;
  readonly concentration: MetricValue;
  readonly diversification: MetricValue;
  readonly capitalInvested: MetricValue;
  readonly cash: MetricValue;
  readonly exposure: MetricValue;
  readonly totalRisk: MetricValue;
  readonly riesgoTecnologico: MetricValue;
  readonly riesgoPolitico: MetricValue;
  readonly byPosition: readonly RiskBreakdownRow[];
  readonly bySector: readonly RiskBreakdownRow[];
  readonly byIndustry: readonly RiskBreakdownRow[];
  readonly byCountry: readonly RiskBreakdownRow[];
  readonly byCurrency: readonly RiskBreakdownRow[];
}

export function metricUnknown(
  unit: MetricValue["unit"],
  status: MetricStatus = "UNKNOWN",
  note?: string,
): MetricValue {
  return { status, value: null, unit, note };
}

export function metricMeasured(
  unit: MetricValue["unit"],
  value: number,
  note?: string,
): MetricValue {
  return { status: "MEASURED", value, unit, note };
}

export function ensurePortfolioAnalyticsSnapshot(
  snapshot: PortfolioAnalyticsSnapshot,
): PortfolioAnalyticsSnapshot {
  assertSerializable(snapshot, "PortfolioAnalyticsSnapshot");
  return snapshot;
}
