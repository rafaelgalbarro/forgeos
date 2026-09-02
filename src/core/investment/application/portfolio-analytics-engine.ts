import {
  ensurePortfolioAnalyticsSnapshot,
  metricMeasured,
  metricUnknown,
  type MetricValue,
  type PortfolioAnalyticsInput,
  type PortfolioAnalyticsSnapshot,
  type RiskBreakdownRow,
} from "../domain/portfolio-analytics";

type GroupByKey = "symbol" | "sector" | "industry" | "country" | "currency";

function safeMean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safeVariance(values: readonly number[]): number | null {
  const mean = safeMean(values);
  if (mean === null || values.length < 2) return null;
  const sq = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return sq / (values.length - 1);
}

function safeStd(values: readonly number[]): number | null {
  const variance = safeVariance(values);
  return variance === null ? null : Math.sqrt(variance);
}

function covariance(xs: readonly number[], ys: readonly number[]): number | null {
  const size = Math.min(xs.length, ys.length);
  if (size < 2) return null;
  const x = xs.slice(0, size);
  const y = ys.slice(0, size);
  const meanX = safeMean(x);
  const meanY = safeMean(y);
  if (meanX === null || meanY === null) return null;
  let sum = 0;
  for (let i = 0; i < size; i += 1) {
    sum += (x[i] - meanX) * (y[i] - meanY);
  }
  return sum / (size - 1);
}

function metricFromNullable(
  unit: MetricValue["unit"],
  value: number | null,
  noteIfMissing: string,
): MetricValue {
  return value === null ? metricUnknown(unit, "NOT_MEASURED", noteIfMissing) : metricMeasured(unit, value);
}

function maxDrawdownPct(returnsSeries: readonly number[]): number | null {
  if (returnsSeries.length === 0) return null;
  let nav = 1;
  let peak = 1;
  let worst = 0;
  for (const periodReturn of returnsSeries) {
    nav *= 1 + periodReturn;
    if (nav > peak) peak = nav;
    const dd = (peak - nav) / peak;
    if (dd > worst) worst = dd;
  }
  return worst * 100;
}

function downsideDeviation(returnsSeries: readonly number[]): number | null {
  if (returnsSeries.length === 0) return null;
  const downside = returnsSeries.filter((r) => r < 0).map((r) => r ** 2);
  if (downside.length === 0) return 0;
  return Math.sqrt(downside.reduce((s, r) => s + r, 0) / returnsSeries.length);
}

function buildBreakdown(
  input: PortfolioAnalyticsInput,
  key: GroupByKey,
  totalInvested: number,
  totalExposure: number,
): RiskBreakdownRow[] {
  const buckets = new Map<string, { invested: number; risk: number; exposure: number }>();
  for (const position of input.positions) {
    const price = position.marketPrice ?? position.averageCost;
    const invested = position.quantity * position.averageCost;
    const exposure = position.quantity * price;
    const riskProxy = Math.abs(position.beta ?? 1) * Math.abs(exposure);
    const k = String(position[key] || "UNKNOWN");
    const prev = buckets.get(k) ?? { invested: 0, risk: 0, exposure: 0 };
    buckets.set(k, {
      invested: prev.invested + invested,
      risk: prev.risk + riskProxy,
      exposure: prev.exposure + exposure,
    });
  }

  const totalRisk = [...buckets.values()].reduce((sum, bucket) => sum + bucket.risk, 0);

  return [...buckets.entries()]
    .map(([bucketKey, values]) => ({
      key: bucketKey,
      label: bucketKey,
      weightPct:
        totalInvested > 0
          ? metricMeasured("PCT", (values.invested / totalInvested) * 100)
          : metricUnknown("PCT", "NOT_MEASURED", "capital invested missing"),
      riskPct:
        totalRisk > 0
          ? metricMeasured("PCT", (values.risk / totalRisk) * 100)
          : metricUnknown("PCT", "NOT_MEASURED", "risk not measurable"),
      exposure:
        totalExposure > 0
          ? metricMeasured("CURRENCY", values.exposure)
          : metricUnknown("CURRENCY", "NOT_MEASURED", "market prices missing"),
    }))
    .sort((a, b) => {
      const av = a.weightPct.value ?? 0;
      const bv = b.weightPct.value ?? 0;
      return bv - av;
    });
}

export function computePortfolioAnalytics(input: PortfolioAnalyticsInput): PortfolioAnalyticsSnapshot {
  const totalInvested = input.positions.reduce((sum, p) => sum + p.quantity * p.averageCost, 0);
  const totalExposure = input.positions.reduce(
    (sum, p) => sum + p.quantity * (p.marketPrice ?? p.averageCost),
    0,
  );
  const cash = input.cash;
  const notional = totalExposure + (cash ?? 0);

  const returnsMean = safeMean(input.portfolioReturns);
  const returnsMetric = metricFromNullable(
    "PCT",
    returnsMean === null ? null : returnsMean * 100,
    "portfolio returns series unavailable",
  );
  const drawdown = metricFromNullable(
    "PCT",
    maxDrawdownPct(input.portfolioReturns),
    "portfolio returns series unavailable",
  );
  const volRaw = safeStd(input.portfolioReturns);
  const volatility = metricFromNullable(
    "PCT",
    volRaw === null ? null : volRaw * 100,
    "portfolio returns series unavailable",
  );

  const sharpeRaw =
    returnsMean !== null && volRaw !== null && volRaw > 0 && input.riskFreeRate !== null
      ? (returnsMean - input.riskFreeRate) / volRaw
      : null;
  const sortinoDen = downsideDeviation(input.portfolioReturns);
  const sortinoRaw =
    returnsMean !== null &&
    sortinoDen !== null &&
    sortinoDen > 0 &&
    input.riskFreeRate !== null
      ? (returnsMean - input.riskFreeRate) / sortinoDen
      : null;

  const benchmarkVariance = safeVariance(input.benchmarkReturns);
  const betaRaw =
    benchmarkVariance && benchmarkVariance > 0
      ? (covariance(input.portfolioReturns, input.benchmarkReturns) ?? 0) / benchmarkVariance
      : null;

  const corrDen =
    safeStd(input.portfolioReturns) !== null && safeStd(input.benchmarkReturns) !== null
      ? safeStd(input.portfolioReturns)! * safeStd(input.benchmarkReturns)!
      : null;
  const correlationsRaw =
    corrDen && corrDen > 0
      ? (covariance(input.portfolioReturns, input.benchmarkReturns) ?? 0) / corrDen
      : null;

  const weights = input.positions
    .map((position) => (totalInvested > 0 ? (position.quantity * position.averageCost) / totalInvested : 0))
    .filter((w) => Number.isFinite(w));
  const concentrationRaw = weights.length > 0 ? Math.max(...weights) * 100 : null;
  const hhi = weights.length > 0 ? weights.reduce((sum, weight) => sum + weight ** 2, 0) : null;
  const diversificationRaw = hhi ? (1 / hhi) : null;

  const positionBreakdown = buildBreakdown(input, "symbol", totalInvested, totalExposure);
  const sectorBreakdown = buildBreakdown(input, "sector", totalInvested, totalExposure);
  const industryBreakdown = buildBreakdown(input, "industry", totalInvested, totalExposure);
  const countryBreakdown = buildBreakdown(input, "country", totalInvested, totalExposure);
  const currencyBreakdown = buildBreakdown(input, "currency", totalInvested, totalExposure);

  const totalRiskRaw =
    positionBreakdown.reduce((sum, row) => sum + (row.riskPct.value ?? 0), 0) > 0
      ? positionBreakdown.reduce((sum, row) => sum + Math.abs(row.exposure.value ?? 0), 0)
      : null;

  return ensurePortfolioAnalyticsSnapshot({
    generatedAt: new Date().toISOString(),
    asOf: input.asOf,
    baseCurrency: input.baseCurrency,
    returns: returnsMetric,
    drawdown,
    volatility,
    sharpe: metricFromNullable("RATIO", sharpeRaw, "risk free rate or volatility unavailable"),
    sortino: metricFromNullable("RATIO", sortinoRaw, "downside returns or risk free rate unavailable"),
    beta: metricFromNullable("RATIO", betaRaw, "benchmark return series unavailable"),
    correlations: metricFromNullable(
      "RATIO",
      correlationsRaw,
      "portfolio/benchmark returns unavailable",
    ),
    concentration: metricFromNullable("PCT", concentrationRaw, "positions unavailable"),
    diversification: metricFromNullable("SCORE", diversificationRaw, "positions unavailable"),
    capitalInvested: metricMeasured("CURRENCY", totalInvested),
    cash:
      cash === null
        ? metricUnknown("CURRENCY", "UNKNOWN", "cash value unavailable")
        : metricMeasured("CURRENCY", cash),
    exposure:
      notional > 0
        ? metricMeasured("PCT", (totalExposure / notional) * 100)
        : metricUnknown("PCT", "NOT_MEASURED", "insufficient notional"),
    totalRisk: metricFromNullable("CURRENCY", totalRiskRaw, "position risk not measurable"),
    riesgoTecnologico:
      sectorBreakdown.find((item) => /technology|software|it|tech/i.test(item.key))?.riskPct ??
      metricUnknown("PCT", "NOT_MEASURED", "technology classification unavailable"),
    riesgoPolitico:
      countryBreakdown.find((item) => /unknown/i.test(item.key))
        ? metricUnknown("PCT", "ESTIMATED", "country risk unresolved for UNKNOWN bucket")
        : metricUnknown("PCT", "NOT_MEASURED", "political risk model unavailable"),
    byPosition: positionBreakdown,
    bySector: sectorBreakdown,
    byIndustry: industryBreakdown,
    byCountry: countryBreakdown,
    byCurrency: currencyBreakdown,
  });
}
