import "server-only";

import { MarketIntelligenceEngine } from "@/src/core/investment/market-intelligence/application/market-intelligence-engine";
import { createProviderRegistryFromEnv } from "@/src/core/investment/market-intelligence/infrastructure/provider-registry";
import { closesToPeriodReturns } from "@/src/core/investment/market-intelligence/infrastructure/adapters/http-shared";

export type BenchmarkSeriesSnapshot = {
  readonly label: "MI" | "NO_DATA";
  readonly symbol: string | null;
  readonly providerId: string | null;
  readonly returns: readonly number[];
  readonly returnCount: number;
  readonly note: string;
};

export type MultiBenchmarkSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly primary: BenchmarkSeriesSnapshot;
  readonly series: readonly BenchmarkSeriesSnapshot[];
  readonly note: string;
};

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function covariance(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const x = xs.slice(-n);
  const y = ys.slice(-n);
  const mx = mean(x);
  const my = mean(y);
  if (mx == null || my == null) return null;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += (x[i]! - mx) * (y[i]! - my);
  return sum / (n - 1);
}

function variance(values: readonly number[]): number | null {
  const m = mean(values);
  if (m == null || values.length < 2) return null;
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

function stdev(values: readonly number[]): number | null {
  const v = variance(values);
  return v == null || v < 0 ? null : Math.sqrt(v);
}

export type BenchmarkAnalytics = {
  readonly beta: number | null;
  readonly alpha: number | null;
  readonly correlation: number | null;
  readonly trackingError: number | null;
  readonly informationRatio: number | null;
  readonly note: string;
};

function parseBenchmarkSymbols(env: NodeJS.ProcessEnv): string[] {
  const multi = (env.FORGEOS_BENCHMARK_SYMBOLS ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const primary = (env.FORGEOS_BENCHMARK_SYMBOL ?? "").trim().toUpperCase();
  const ordered = [...(primary ? [primary] : []), ...multi];
  return Array.from(new Set(ordered)).slice(0, 4);
}

async function loadOneBenchmarkSymbol(
  symbol: string,
  env: NodeJS.ProcessEnv,
): Promise<BenchmarkSeriesSnapshot> {
  const registry = createProviderRegistryFromEnv(env);
  if (registry.marketProviders.length === 0) {
    return {
      label: "NO_DATA",
      symbol,
      providerId: null,
      returns: [],
      returnCount: 0,
      note: "NO_DATA — no Market Intelligence market providers configured for benchmark.",
    };
  }

  try {
    const engine = new MarketIntelligenceEngine({
      marketProviders: registry.marketProviders,
      newsProviders: [],
      economicProviders: [],
      sentimentProviders: [],
    });
    const result = await engine.gather({ symbols: [symbol] });
    const snap = result.marketSnapshots.find((s) => s.symbol.toUpperCase() === symbol);
    const closes = snap?.timeSeries?.points.map((p) => p.close) ?? [];
    const returns = closesToPeriodReturns(closes);
    if (returns.length === 0) {
      return {
        label: "NO_DATA",
        symbol,
        providerId: snap?.providerId ?? null,
        returns: [],
        returnCount: 0,
        note: `NO_DATA — providers returned no benchmark time series for ${symbol}.`,
      };
    }
    return {
      label: "MI",
      symbol,
      providerId: snap?.providerId ?? result.providersUsed[0] ?? null,
      returns,
      returnCount: returns.length,
      note: `MI benchmark ${symbol} via ${snap?.providerId ?? "provider"} (${returns.length} period returns).`,
    };
  } catch (error) {
    return {
      label: "NO_DATA",
      symbol,
      providerId: null,
      returns: [],
      returnCount: 0,
      note: error instanceof Error ? `NO_DATA — ${error.message}` : "NO_DATA — benchmark load failed",
    };
  }
}

/**
 * Load external benchmark return series via configured MI providers only.
 * Returns NO_DATA when symbol unset, no providers, or no time series — never invents.
 */
export async function loadBenchmarkReturns(
  env: NodeJS.ProcessEnv = process.env,
): Promise<BenchmarkSeriesSnapshot> {
  const symbols = parseBenchmarkSymbols(env);
  if (symbols.length === 0) {
    return {
      label: "NO_DATA",
      symbol: null,
      providerId: null,
      returns: [],
      returnCount: 0,
      note: "NO_DATA — set FORGEOS_BENCHMARK_SYMBOL (and optional FORGEOS_BENCHMARK_SYMBOLS) plus a market provider API key (not invented).",
    };
  }
  return loadOneBenchmarkSymbol(symbols[0]!, env);
}

/**
 * Load up to 4 MI benchmarks (primary + FORGEOS_BENCHMARK_SYMBOLS). Graceful NO_DATA per symbol.
 */
export async function loadMultiBenchmarkReturns(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MultiBenchmarkSnapshot> {
  const symbols = parseBenchmarkSymbols(env);
  if (symbols.length === 0) {
    const empty: BenchmarkSeriesSnapshot = {
      label: "NO_DATA",
      symbol: null,
      providerId: null,
      returns: [],
      returnCount: 0,
      note: "NO_DATA — set FORGEOS_BENCHMARK_SYMBOL / FORGEOS_BENCHMARK_SYMBOLS and a market provider key.",
    };
    return {
      generatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      primary: empty,
      series: [],
      note: empty.note,
    };
  }

  const series: BenchmarkSeriesSnapshot[] = [];
  for (const symbol of symbols) {
    series.push(await loadOneBenchmarkSymbol(symbol, env));
  }
  const primary = series[0]!;
  const miCount = series.filter((s) => s.label === "MI").length;
  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    primary,
    series,
    note:
      miCount === 0
        ? `NO_DATA — ${series.length} symbol(s) requested, none returned MI history.`
        : `Loaded ${miCount}/${series.length} MI benchmark series (ANALYSIS_ONLY).`,
  };
}

/** Beta/alpha/correlation/TE/IR vs PAPER period returns when both series exist. */
export function computeBenchmarkAnalytics(
  portfolioReturns: readonly number[],
  benchmarkReturns: readonly number[],
): BenchmarkAnalytics {
  if (portfolioReturns.length < 2 || benchmarkReturns.length < 2) {
    return {
      beta: null,
      alpha: null,
      correlation: null,
      trackingError: null,
      informationRatio: null,
      note: "NO_DATA — need ≥2 PAPER and benchmark period returns",
    };
  }
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const p = portfolioReturns.slice(-n);
  const b = benchmarkReturns.slice(-n);
  const bVar = variance(b);
  const pVar = variance(p);
  const cov = covariance(p, b);
  const beta = bVar != null && bVar > 0 && cov != null ? cov / bVar : null;
  const mp = mean(p);
  const mb = mean(b);
  const alpha = mp != null && mb != null ? mp - mb : null;
  const corr =
    cov != null && pVar != null && bVar != null && pVar > 0 && bVar > 0
      ? cov / Math.sqrt(pVar * bVar)
      : null;
  const active = p.map((v, i) => v - b[i]!);
  const trackingError = stdev(active);
  const meanActive = mean(active);
  const informationRatio =
    meanActive != null && trackingError != null && trackingError > 0
      ? meanActive / trackingError
      : null;

  const hasCore = beta != null || alpha != null;
  return {
    beta,
    alpha,
    correlation: corr,
    trackingError,
    informationRatio,
    note: hasCore
      ? `Computed from PAPER period returns vs MI benchmark (n=${n}, ANALYSIS_ONLY)`
      : "NO_DATA — unable to compute beta/alpha",
  };
}
