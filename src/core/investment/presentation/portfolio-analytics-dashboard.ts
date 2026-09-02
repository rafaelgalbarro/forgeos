import type {
  MetricStatus,
  MetricValue,
  PortfolioAnalyticsSnapshot,
  RiskBreakdownRow,
} from "../domain/portfolio-analytics";

export interface AnalyticsMetricCard {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly status: MetricStatus;
  readonly note?: string;
}

export interface PortfolioAnalyticsDashboardModel {
  readonly generatedAt: string;
  readonly asOf: string;
  readonly baseCurrency: string;
  readonly metricCards: readonly AnalyticsMetricCard[];
  readonly riskCards: readonly AnalyticsMetricCard[];
  readonly byPosition: readonly RiskBreakdownRow[];
  readonly bySector: readonly RiskBreakdownRow[];
  readonly byIndustry: readonly RiskBreakdownRow[];
  readonly byCountry: readonly RiskBreakdownRow[];
  readonly byCurrency: readonly RiskBreakdownRow[];
}

function formatMetric(metric: MetricValue): string {
  if (metric.value === null) return metric.status;
  if (metric.unit === "PCT") return `${metric.value.toFixed(2)}%`;
  if (metric.unit === "RATIO") return metric.value.toFixed(4);
  if (metric.unit === "CURRENCY") return metric.value.toFixed(2);
  if (metric.unit === "COUNT") return metric.value.toFixed(0);
  return metric.value.toFixed(2);
}

function toCard(key: string, label: string, metric: MetricValue): AnalyticsMetricCard {
  return {
    key,
    label,
    value: formatMetric(metric),
    status: metric.status,
    note: metric.note,
  };
}

export function buildPortfolioAnalyticsDashboardModel(
  snapshot: PortfolioAnalyticsSnapshot,
): PortfolioAnalyticsDashboardModel {
  return {
    generatedAt: snapshot.generatedAt,
    asOf: snapshot.asOf,
    baseCurrency: snapshot.baseCurrency,
    metricCards: [
      toCard("returns", "Rentabilidad", snapshot.returns),
      toCard("drawdown", "Drawdown", snapshot.drawdown),
      toCard("volatility", "Volatilidad", snapshot.volatility),
      toCard("sharpe", "Sharpe", snapshot.sharpe),
      toCard("sortino", "Sortino", snapshot.sortino),
      toCard("beta", "Beta", snapshot.beta),
      toCard("correlations", "Correlaciones", snapshot.correlations),
      toCard("concentration", "Concentracion", snapshot.concentration),
      toCard("diversification", "Diversificacion", snapshot.diversification),
      toCard("capital", "Capital invertido", snapshot.capitalInvested),
      toCard("cash", "Cash", snapshot.cash),
      toCard("exposure", "Exposicion", snapshot.exposure),
    ],
    riskCards: [
      toCard("totalRisk", "Riesgo total", snapshot.totalRisk),
      toCard("sectorRisk", "Riesgo por sector", snapshot.bySector[0]?.riskPct ?? snapshot.totalRisk),
      toCard("geoRisk", "Riesgo geografico", snapshot.byCountry[0]?.riskPct ?? snapshot.totalRisk),
      toCard("currencyRisk", "Riesgo divisa", snapshot.byCurrency[0]?.riskPct ?? snapshot.totalRisk),
      toCard("techRisk", "Riesgo tecnologico", snapshot.riesgoTecnologico),
      toCard("politicalRisk", "Riesgo politico", snapshot.riesgoPolitico),
    ],
    byPosition: snapshot.byPosition,
    bySector: snapshot.bySector,
    byIndustry: snapshot.byIndustry,
    byCountry: snapshot.byCountry,
    byCurrency: snapshot.byCurrency,
  };
}
