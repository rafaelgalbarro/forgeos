import "server-only";

import { computePortfolioAnalytics } from "@/src/core/investment/application/portfolio-analytics-engine";
import type {
  MetricValue,
  PortfolioAnalyticsPosition,
  RiskBreakdownRow,
} from "@/src/core/investment/domain/portfolio-analytics";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { resolvePortfolioMonitorProvider } from "@/lib/investment/portfolio-monitor-provider-factory";
import { getCommitteeReplaySnapshot } from "@/lib/investment/committee-replay";
import { getRiskAlertsSnapshot } from "@/lib/investment/risk-alerts-snapshot";
import { computeCalmar } from "@/src/core/investment/strategy-lab/application/metrics";
import type {
  AllocationBucket,
  EquityPoint,
  MetricDisplay,
  PortfolioManagementSnapshot,
  PortfolioPositionRow,
} from "@/lib/investment/portfolio-management.types";

type AccountTag = { value: string; currency: string };
type AccountMap = Record<string, Record<string, AccountTag>>;
type RawBrokerPosition = {
  symbol?: string;
  position?: number;
  avgCost?: number;
  currency?: string;
  secType?: string;
  exchange?: string;
  name?: string | null;
  marketPrice?: number | null;
  marketValue?: number | null;
  unrealizedPnl?: number | null;
  unrealizedPnlPct?: number | null;
  sector?: string | null;
  country?: string | null;
};

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sumAccountTag(account: AccountMap | null, tag: string): number | null {
  if (!account) return null;
  let total = 0;
  let found = false;
  for (const tags of Object.values(account)) {
    const row = tags?.[tag];
    const n = numberOrNull(row?.value);
    if (n != null) {
      total += n;
      found = true;
    }
  }
  return found ? total : null;
}

function currencyFromAccount(account: AccountMap | null): string {
  if (!account) return "UNKNOWN";
  for (const tags of Object.values(account)) {
    const c = tags?.NetLiquidation?.currency ?? tags?.TotalCashValue?.currency;
    if (typeof c === "string" && c.trim()) return c;
  }
  return "UNKNOWN";
}

/** Historical VaR at confidence as absolute loss % of return distribution. */
export function historicalVarPct(
  returns: readonly number[],
  confidence = 0.95,
): number | null {
  if (returns.length < 5) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor((1 - confidence) * sorted.length));
  const q = sorted[idx];
  if (q == null || !Number.isFinite(q)) return null;
  return Math.abs(Math.min(q, 0)) * 100;
}

export function returnsToEquityCurve(returns: readonly number[]): EquityPoint[] {
  if (returns.length === 0) return [];
  let nav = 100;
  const points: EquityPoint[] = [{ index: 0, equity: nav }];
  returns.forEach((r, i) => {
    nav *= 1 + r;
    points.push({ index: i + 1, equity: Number(nav.toFixed(4)) });
  });
  return points;
}

export function metricFromNullable(
  label: string,
  value: number | null,
  unit: MetricDisplay["unit"],
  digits = 2,
  note?: string,
  status: "MEASURED" | "ESTIMATED" = "MEASURED",
): MetricDisplay {
  if (value == null || !Number.isFinite(value)) {
    return { label, value: null, display: "NO_DATA", status: "NO_DATA", unit, note };
  }
  const display =
    unit === "PCT"
      ? `${value.toFixed(digits)}%`
      : unit === "RATIO"
        ? value.toFixed(Math.max(digits, 3))
        : unit === "COUNT"
          ? String(Math.round(value))
          : value.toLocaleString("en-US", { maximumFractionDigits: digits });
  return { label, value, display, status, unit, note };
}

function metricFromAnalytics(
  label: string,
  metric: MetricValue,
  digits = 2,
  status: "MEASURED" | "ESTIMATED" = "MEASURED",
): MetricDisplay {
  if (metric.value == null || metric.status === "NOT_MEASURED" || metric.status === "UNKNOWN") {
    return {
      label,
      value: null,
      display: "NO_DATA",
      status: "NO_DATA",
      unit: metric.unit === "CURRENCY" ? "CURRENCY" : metric.unit === "PCT" ? "PCT" : "RATIO",
      note: metric.note,
    };
  }
  return metricFromNullable(
    label,
    metric.value,
    metric.unit === "CURRENCY" ? "CURRENCY" : metric.unit === "PCT" ? "PCT" : "RATIO",
    digits,
    metric.note,
    status,
  );
}

function mapBreakdown(rows: readonly RiskBreakdownRow[]): AllocationBucket[] {
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    weightPct: row.weightPct.value,
    exposure: row.exposure.value,
    riskPct: row.riskPct.value,
  }));
}

function groupByKey(
  positions: ReadonlyArray<{
    key: string;
    invested: number;
    exposure: number;
    risk: number;
  }>,
): AllocationBucket[] {
  const buckets = new Map<string, { invested: number; exposure: number; risk: number }>();
  for (const p of positions) {
    const prev = buckets.get(p.key) ?? { invested: 0, exposure: 0, risk: 0 };
    buckets.set(p.key, {
      invested: prev.invested + p.invested,
      exposure: prev.exposure + p.exposure,
      risk: prev.risk + p.risk,
    });
  }
  const totalInvested = [...buckets.values()].reduce((s, b) => s + b.invested, 0);
  const totalRisk = [...buckets.values()].reduce((s, b) => s + b.risk, 0);
  return [...buckets.entries()]
    .map(([key, v]) => ({
      key,
      label: key,
      weightPct: totalInvested > 0 ? (v.invested / totalInvested) * 100 : null,
      exposure: v.exposure,
      riskPct: totalRisk > 0 ? (v.risk / totalRisk) * 100 : null,
    }))
    .sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0));
}

export function emptyPortfolioManagementSnapshot(note: string): PortfolioManagementSnapshot {
  const no = (label: string, unit?: MetricDisplay["unit"]): MetricDisplay => ({
    label,
    value: null,
    display: "NO_DATA",
    status: "NO_DATA",
    unit,
  });
  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    dataSource: "UNAVAILABLE",
    baseCurrency: "UNKNOWN",
    note,
    summary: {
      portfolioValue: no("Valor cartera", "CURRENCY"),
      pnlDaily: no("P&L diario", "CURRENCY"),
      pnlWeekly: no("P&L semanal", "CURRENCY"),
      pnlMonthly: no("P&L mensual", "CURRENCY"),
      pnlAnnual: no("P&L anual", "CURRENCY"),
      cash: no("Cash", "CURRENCY"),
      buyingPower: no("Buying Power", "CURRENCY"),
      capitalInvested: no("Capital invertido", "CURRENCY"),
      capitalLibre: no("Capital libre", "CURRENCY"),
      unrealizedPnl: no("P&L no realizado", "CURRENCY"),
      positionCount: no("Posiciones", "COUNT"),
    },
    allocations: {
      bySector: [],
      byCountry: [],
      byCurrency: [],
      byMarket: [],
      byProduct: [],
    },
    risk: {
      var95: no("VaR 95%", "PCT"),
      drawdown: no("Drawdown", "PCT"),
      sharpe: no("Sharpe", "RATIO"),
      sortino: no("Sortino", "RATIO"),
      calmar: no("Calmar", "RATIO"),
      volatility: no("Volatilidad", "PCT"),
      beta: no("Beta", "RATIO"),
      correlations: no("Correlaciones", "RATIO"),
      concentration: no("Concentración", "PCT"),
      stressTest: no("Stress Test"),
      stressLines: ["NO_DATA — stress engine not bound to live portfolio"],
    },
    positions: [],
    equityCurve: [],
    committeeRecommendation: null,
  };
}

async function loadRawBrokerExtras(): Promise<{
  account: AccountMap | null;
  rawPositions: RawBrokerPosition[];
  accountError?: string;
}> {
  try {
    const [rawPositions, account] = await Promise.all([
      ibkrServiceFetch<RawBrokerPosition[]>("/api/ibkr/positions").catch(() => [] as RawBrokerPosition[]),
      ibkrServiceFetch<AccountMap>("/api/ibkr/account").catch(() => null),
    ]);
    return {
      account,
      rawPositions: Array.isArray(rawPositions) ? rawPositions : [],
    };
  } catch (error) {
    return {
      account: null,
      rawPositions: [],
      accountError: error instanceof Error ? error.message : "broker extras unavailable",
    };
  }
}

/**
 * Read-only portfolio management snapshot.
 * Never invents P&L or risk — NO_DATA when series/tags absent.
 * Never flips LIVE_TRADING_ENABLED / IBKR_READ_ONLY; no order path.
 */
export async function getPortfolioManagementSnapshot(): Promise<PortfolioManagementSnapshot> {
  const resolved = resolvePortfolioMonitorProvider();
  let analyticsInput;
  try {
    analyticsInput = await resolved.provider.loadSnapshot();
  } catch (error) {
    return emptyPortfolioManagementSnapshot(
      error instanceof Error
        ? `NO_DATA — portfolio load failed (${error.message})`
        : "NO_DATA — portfolio load failed",
    );
  }

  // Label after load — provider may fall back to DEMO on IBKR failure.
  const extras = await loadRawBrokerExtras();
  const liveRawPositions = extras.rawPositions.filter(
    (row) => Math.abs(Number(row.position ?? 0)) > 0,
  );
  if (
    analyticsInput.positions.filter((p) => p.quantity !== 0).length === 0 &&
    liveRawPositions.length > 0
  ) {
    analyticsInput = {
      ...analyticsInput,
      positions: liveRawPositions.map((row) => ({
        symbol: String(row.symbol ?? "UNKNOWN"),
        quantity: Number(row.position ?? 0),
        averageCost: Number(row.avgCost ?? 0),
        marketPrice: numberOrNull(row.marketPrice),
        currency: String(row.currency ?? "UNKNOWN"),
        sector: "UNKNOWN",
        industry: "UNKNOWN",
        country: "UNKNOWN",
        beta: null,
        returnsSeries: [],
      })),
    };
  }

  const metricStatus =
    extras.account || liveRawPositions.length > 0
      ? "MEASURED"
      : resolved.label === "DEMO"
        ? "ESTIMATED"
        : "MEASURED";

  const analytics = computePortfolioAnalytics(analyticsInput);
  const rawBySymbol = new Map<string, RawBrokerPosition>();
  for (const row of extras.rawPositions) {
    const sym = String(row.symbol ?? "").toUpperCase();
    if (sym) rawBySymbol.set(sym, row);
  }

  const netLiq = sumAccountTag(extras.account, "NetLiquidation");
  const cash = sumAccountTag(extras.account, "TotalCashValue") ?? analyticsInput.cash;
  const buyingPower = sumAccountTag(extras.account, "BuyingPower");
  const availableFunds = sumAccountTag(extras.account, "AvailableFunds");
  const dailyPnl =
    sumAccountTag(extras.account, "DailyPnL") ??
    (() => {
      const unrealized = sumAccountTag(extras.account, "UnrealizedPnL");
      const realized = sumAccountTag(extras.account, "RealizedPnL");
      if (unrealized == null && realized == null) return null;
      return (unrealized ?? 0) + (realized ?? 0);
    })();
  const unrealizedTag = sumAccountTag(extras.account, "UnrealizedPnL");
  const baseCurrency =
    analyticsInput.baseCurrency !== "UNKNOWN"
      ? analyticsInput.baseCurrency
      : currencyFromAccount(extras.account);

  const capitalInvested = analytics.capitalInvested.value;
  const portfolioValue =
    netLiq ??
    (capitalInvested != null && cash != null
      ? capitalInvested + cash
      : capitalInvested ?? null);

  const capitalLibre = availableFunds ?? cash;

  // Period P&L beyond DailyPnL tag is not available from account snapshot — stay NO_DATA.
  const summary = {
    portfolioValue: metricFromNullable("Valor cartera", portfolioValue, "CURRENCY", 2, undefined, metricStatus),
    pnlDaily: metricFromNullable("P&L diario", dailyPnl, "CURRENCY", 2, undefined, metricStatus),
    pnlWeekly: metricFromNullable("P&L semanal", null, "CURRENCY", 2, "IBKR account tag unavailable", metricStatus),
    pnlMonthly: metricFromNullable("P&L mensual", null, "CURRENCY", 2, "IBKR account tag unavailable", metricStatus),
    pnlAnnual: metricFromNullable("P&L anual", null, "CURRENCY", 2, "IBKR account tag unavailable", metricStatus),
    cash: metricFromNullable("Cash", cash, "CURRENCY", 2, undefined, metricStatus),
    buyingPower: metricFromNullable("Buying Power", buyingPower, "CURRENCY", 2, undefined, metricStatus),
    capitalInvested: metricFromAnalytics("Capital invertido", analytics.capitalInvested, 2, metricStatus),
    capitalLibre: metricFromNullable("Capital libre", capitalLibre, "CURRENCY", 2, undefined, metricStatus),
    unrealizedPnl: metricFromNullable("P&L no realizado", unrealizedTag, "CURRENCY", 2, undefined, metricStatus),
    positionCount: metricFromNullable(
      "Posiciones",
      analyticsInput.positions.filter((p) => p.quantity !== 0).length,
      "COUNT",
      0,
      undefined,
      metricStatus,
    ),
  };

  const marketProductRows = analyticsInput.positions.map((p) => {
    const raw = rawBySymbol.get(p.symbol.toUpperCase());
    const price = p.marketPrice ?? p.averageCost;
    const invested = Math.abs(p.quantity * p.averageCost);
    const exposure = Math.abs(p.quantity * price);
    const risk = Math.abs(p.beta ?? 1) * exposure;
    const secType = String(raw?.secType ?? "UNKNOWN");
    const exchange = String(raw?.exchange ?? "UNKNOWN");
    return {
      market: { key: exchange || "UNKNOWN", invested, exposure, risk },
      product: { key: secType || "UNKNOWN", invested, exposure, risk },
    };
  });

  const allocations = {
    bySector: mapBreakdown(analytics.bySector),
    byCountry: mapBreakdown(analytics.byCountry),
    byCurrency: mapBreakdown(analytics.byCurrency),
    byMarket: groupByKey(marketProductRows.map((r) => r.market)),
    byProduct: groupByKey(marketProductRows.map((r) => r.product)),
  };

  const var95 = historicalVarPct(analyticsInput.portfolioReturns, 0.95);
  const meanReturn =
    analyticsInput.portfolioReturns.length > 0
      ? analyticsInput.portfolioReturns.reduce((s, r) => s + r, 0) /
        analyticsInput.portfolioReturns.length
      : null;
  const periods = analyticsInput.portfolioReturns.length;
  const cagrApprox =
    meanReturn != null && periods > 0
      ? Math.pow(1 + meanReturn, Math.min(252, periods)) - 1
      : null;
  const calmar = computeCalmar(cagrApprox, analytics.drawdown.value);

  let stressLines: string[] = [];
  let stressDisplay: MetricDisplay;
  try {
    const alerts = await getRiskAlertsSnapshot();
    if (alerts.alerts.length === 0) {
      stressLines = [
        alerts.note || "NO_DATA — no monitor/audit stress breaches",
        `Monitor: ${alerts.monitorLabel}`,
      ];
      stressDisplay = {
        label: "Stress Test",
        value: null,
        display: "NO_DATA",
        status: "NO_DATA",
        note: alerts.note,
      };
    } else {
      stressLines = alerts.alerts.slice(0, 8).map(
        (a) =>
          `[${a.severity}] ${a.code}: ${a.title} (value=${a.value ?? "NO_DATA"} / thr=${a.threshold ?? "NO_DATA"})`,
      );
      stressDisplay = {
        label: "Stress Test",
        value: alerts.alerts.length,
        display: `${alerts.alerts.length} breach(es)`,
        status: metricStatus,
        unit: "COUNT",
        note: "Dry-run / monitor alerts only — not a full scenario engine",
      };
    }
  } catch {
    stressLines = ["NO_DATA — risk alerts unavailable"];
    stressDisplay = {
      label: "Stress Test",
      value: null,
      display: "NO_DATA",
      status: "NO_DATA",
    };
  }

  const risk = {
    var95: metricFromNullable("VaR 95%", var95, "PCT", 2, "Historical from portfolio return series", metricStatus),
    drawdown: metricFromAnalytics("Drawdown", analytics.drawdown, 2, metricStatus),
    sharpe: metricFromAnalytics("Sharpe", analytics.sharpe, 3, metricStatus),
    sortino: metricFromAnalytics("Sortino", analytics.sortino, 3, metricStatus),
    calmar: metricFromNullable("Calmar", calmar, "RATIO", 3, undefined, metricStatus),
    volatility: metricFromAnalytics("Volatilidad", analytics.volatility, 2, metricStatus),
    beta: metricFromAnalytics("Beta", analytics.beta, 3, metricStatus),
    correlations: metricFromAnalytics("Correlaciones", analytics.correlations, 3, metricStatus),
    concentration: metricFromAnalytics("Concentración", analytics.concentration, 2, metricStatus),
    stressTest: stressDisplay,
    stressLines,
  };

  const aiBySymbol = new Map<string, string>();
  let committeeRecommendation: string | null = null;
  try {
    const replay = await getCommitteeReplaySnapshot({ limit: 80 });
    committeeRecommendation =
      replay.entries.find((e) => e.recommendation)?.recommendation ?? null;
    for (const entry of replay.entries) {
      const sym = entry.symbol?.toUpperCase();
      if (!sym || sym === "NO_DATA") continue;
      if (!aiBySymbol.has(sym) && entry.recommendation) {
        aiBySymbol.set(sym, entry.recommendation);
      }
    }
  } catch {
    /* leave AI / committee as NO_DATA */
  }

  const totalExposure = analyticsInput.positions.reduce(
    (s, p) => s + Math.abs(p.quantity * (p.marketPrice ?? p.averageCost)),
    0,
  );

  const positions: PortfolioPositionRow[] = analyticsInput.positions
    .filter((p) => p.quantity !== 0)
    .map((p: PortfolioAnalyticsPosition) => {
      const raw = rawBySymbol.get(p.symbol.toUpperCase());
      const currentPrice =
        typeof raw?.marketPrice === "number" && Number.isFinite(raw.marketPrice)
          ? raw.marketPrice
          : p.marketPrice;
      const qty = p.quantity;
      const avg = p.averageCost;
      const pnlFromRaw =
        typeof raw?.unrealizedPnl === "number" && Number.isFinite(raw.unrealizedPnl)
          ? raw.unrealizedPnl
          : null;
      const pnl =
        pnlFromRaw ??
        (currentPrice != null ? qty * (currentPrice - avg) : null);
      const returnPct =
        typeof raw?.unrealizedPnlPct === "number" && Number.isFinite(raw.unrealizedPnlPct)
          ? raw.unrealizedPnlPct
          : currentPrice != null && avg !== 0
            ? ((currentPrice - avg) / Math.abs(avg)) * 100 * Math.sign(qty)
            : null;
      const exposure = Math.abs(qty * (currentPrice ?? avg));
      const weightPct = totalExposure > 0 ? (exposure / totalExposure) * 100 : null;
      const riskLabel =
        p.beta != null && Number.isFinite(p.beta)
          ? `β ${p.beta.toFixed(2)}`
          : weightPct != null
            ? `w ${weightPct.toFixed(1)}%`
            : "NO_DATA";
      const name =
        typeof raw?.name === "string" && raw.name.trim()
          ? raw.name.trim()
          : "NO_DATA";

      return {
        ticker: p.symbol,
        name,
        quantity: qty,
        avgPrice: avg,
        currentPrice,
        pnl,
        returnPct,
        weightPct,
        risk: riskLabel,
        aiRecommendation: aiBySymbol.get(p.symbol.toUpperCase()) ?? "NO_DATA",
        currency: p.currency,
        secType: String(raw?.secType ?? "UNKNOWN"),
        sector: p.sector || "UNKNOWN",
        country: p.country || "UNKNOWN",
        exchange: String(raw?.exchange ?? "UNKNOWN"),
      };
    })
    .sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0));

  const dataSource =
    extras.account || liveRawPositions.length > 0
      ? "IBKR_LIVE_READ_ONLY"
      : resolved.label === "IBKR_LIVE_READ_ONLY"
        ? "IBKR_LIVE_READ_ONLY"
        : resolved.label === "DEMO"
          ? "DEMO"
          : "UNAVAILABLE";

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    dataSource,
    baseCurrency,
    note: `${resolved.note} · ANALYSIS_ONLY · no orders`,
    summary,
    allocations,
    risk,
    positions,
    equityCurve: returnsToEquityCurve(analyticsInput.portfolioReturns),
    committeeRecommendation,
  };
}
