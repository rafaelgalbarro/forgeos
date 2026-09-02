import "server-only";

import { createDefaultStrategyEngine } from "@/src/core/investment/strategy";
import type {
  StrategyMarketContext,
  StrategyRegime,
} from "@/src/core/investment/strategy/domain/types";
import { MarketIntelligenceEngine } from "@/src/core/investment/market-intelligence/application/market-intelligence-engine";
import { createProviderRegistryFromEnv } from "@/src/core/investment/market-intelligence/infrastructure/provider-registry";
import { getChartBars, isYahooFinanceEnabled } from "@/lib/market-data/yahoo-finance";

export type BacktestBarResult = {
  readonly index: number;
  readonly price: number;
  readonly bias: string;
  readonly score: number | null;
  readonly hasEntryIntent: boolean;
};

export type BacktestStrategyResult = {
  readonly strategyId: string;
  readonly name: string;
  readonly bars: number;
  readonly entrySignals: number;
  readonly avgScore: number | null;
  readonly lastBias: string;
  readonly path: readonly BacktestBarResult[];
};

export type BacktestRunSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly strategyReadiness: "NOT_READY";
  readonly autonomousLive: "LOCKED";
  readonly dataLabel: "DEMO" | "MI" | "YAHOO";
  readonly symbol: string;
  readonly regime: StrategyRegime;
  readonly strategyId: string | "ALL";
  readonly barCount: number;
  readonly results: readonly BacktestStrategyResult[];
  readonly note: string;
};

const DEMO_RETURNS = [0.01, 0.008, -0.002, 0.004, 0.006, -0.01, 0.003, 0.007, -0.005, 0.002] as const;

function buildContext(
  symbol: string,
  regime: StrategyRegime,
  price: number,
  returnsWindow: readonly number[],
): StrategyMarketContext {
  const smaFast =
    returnsWindow.length >= 3
      ? price * (1 + returnsWindow.slice(-3).reduce((s, r) => s + r, 0) / 3)
      : price * 1.01;
  const smaSlow =
    returnsWindow.length >= 5
      ? price * (1 + returnsWindow.slice(-5).reduce((s, r) => s + r, 0) / 5)
      : price * 0.98;
  return {
    symbol,
    price,
    bid: price * 0.9995,
    ask: price * 1.0005,
    volume: 1_000_000,
    averageVolume: 900_000,
    returns: returnsWindow.slice(-5),
    smaFast,
    smaSlow,
    rsi: 50 + returnsWindow.slice(-3).reduce((s, r) => s + r, 0) * 100,
    atr: Math.max(0.5, price * 0.02),
    volatility: 0.2,
    beta: 1,
    peRatio: 20,
    pbRatio: 3,
    roe: 15,
    earningsGrowth: 8,
    dividendYield: 1.2,
    qualityScore: 0.7,
    regime,
    capturedAt: new Date().toISOString(),
  };
}

async function loadPricePath(
  symbol: string,
  env: NodeJS.ProcessEnv,
): Promise<{ prices: number[]; label: "DEMO" | "MI" | "YAHOO"; note: string }> {
  // Prefer Yahoo multi-year daily closes when enabled (Phase I advanced history).
  if (symbol !== "DEMO" && isYahooFinanceEnabled()) {
    try {
      const yahooBars = await getChartBars(symbol, "1d", "5y");
      const closes = yahooBars.map((b) => b.close).filter((c) => Number.isFinite(c) && c > 0);
      if (closes.length >= 40) {
        return {
          prices: closes,
          label: "YAHOO",
          note: `Yahoo Finance daily closes 5y (${closes.length} bars).`,
        };
      }
    } catch {
      /* fall through */
    }
  }

  const registry = createProviderRegistryFromEnv(env);
  if (registry.marketProviders.length > 0 && symbol !== "DEMO") {
    try {
      const engine = new MarketIntelligenceEngine({
        marketProviders: registry.marketProviders,
        newsProviders: [],
        economicProviders: [],
        sentimentProviders: [],
      });
      const result = await engine.gather({ symbols: [symbol] });
      const snap = result.marketSnapshots.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
      const closes = snap?.timeSeries?.points.map((p) => p.close).filter((c) => Number.isFinite(c)) ?? [];
      if (closes.length >= 5) {
        return {
          prices: closes.slice(-40),
          label: "MI",
          note: `MI historical closes via ${snap?.providerId ?? "provider"} (${closes.length} bars).`,
        };
      }
    } catch {
      /* fall through to DEMO */
    }
  }

  let price = 100;
  const prices = [price];
  for (const r of DEMO_RETURNS) {
    price = price * (1 + r);
    prices.push(Number(price.toFixed(4)));
  }
  return {
    prices,
    label: "DEMO",
    note: "DEMO synthetic price path — offline Strategy Engine walk. No broker. NOT_READY.",
  };
}

/**
 * Offline Strategy Engine backtest walk — ANALYSIS_ONLY.
 * Uses MI closes when available; otherwise DEMO path. Never submits orders.
 */
export async function runStrategyBacktest(options?: {
  readonly symbol?: string;
  readonly regime?: StrategyRegime;
  readonly strategyId?: string;
  readonly env?: NodeJS.ProcessEnv;
}): Promise<BacktestRunSnapshot> {
  const symbol = (options?.symbol ?? "DEMO").trim().toUpperCase() || "DEMO";
  const regime = options?.regime ?? "bullish";
  const strategyFilter = options?.strategyId?.trim() || "ALL";
  const env = options?.env ?? process.env;

  const path = await loadPricePath(symbol, env);
  const engine = createDefaultStrategyEngine();
  const allMeta = engine.listMetadata();
  const strategies =
    strategyFilter === "ALL"
      ? allMeta
      : allMeta.filter((m) => m.strategyId === strategyFilter);

  const results: BacktestStrategyResult[] = [];

  for (const meta of strategies) {
    const bars: BacktestBarResult[] = [];
    let entrySignals = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (let i = 1; i < path.prices.length; i += 1) {
      const price = path.prices[i]!;
      const returnsWindow: number[] = [];
      for (let j = 1; j <= i; j += 1) {
        const prev = path.prices[j - 1]!;
        const cur = path.prices[j]!;
        if (prev !== 0) returnsWindow.push((cur - prev) / prev);
      }
      const ctx = buildContext(symbol, regime, price, returnsWindow);
      const analysis = engine.analyze(meta.strategyId, ctx);
      const entry = engine.generateEntry(meta.strategyId, ctx, analysis);
      if (entry) entrySignals += 1;
      if (typeof analysis.score === "number") {
        scoreSum += analysis.score;
        scoreCount += 1;
      }
      bars.push({
        index: i,
        price,
        bias: analysis.bias ?? "NO_DATA",
        score: typeof analysis.score === "number" ? analysis.score : null,
        hasEntryIntent: entry != null,
      });
    }

    results.push({
      strategyId: meta.strategyId,
      name: meta.name,
      bars: bars.length,
      entrySignals,
      avgScore: scoreCount ? scoreSum / scoreCount : null,
      lastBias: bars.at(-1)?.bias ?? "NO_DATA",
      // Full path retained for walk-forward windows; UI shows a short tail
      path: bars,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    strategyReadiness: "NOT_READY",
    autonomousLive: "LOCKED",
    dataLabel: path.label,
    symbol,
    regime,
    strategyId: strategyFilter === "ALL" ? "ALL" : strategyFilter,
    barCount: Math.max(0, path.prices.length - 1),
    results,
    note: `${path.note} Zero real orders.`,
  };
}
