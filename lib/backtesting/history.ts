import "server-only";

/**
 * Historical bars for advanced backtesting via Yahoo Finance helpers.
 * Prefers ~5y daily; short-term horizons use 5m / 1d swing windows.
 */

import {
  getChartBars,
  isYahooFinanceEnabled,
  type YahooChartInterval,
} from "@/lib/market-data/yahoo-finance";
import type { BacktestBar, BacktestHorizon } from "./types";

export type HistoryLoadResult = {
  readonly bars: readonly BacktestBar[];
  readonly dataLabel: "YAHOO" | "DEMO";
  readonly interval: string;
  readonly range: string;
  readonly note: string;
};

const DEMO_RETURNS = [
  0.012, -0.008, 0.006, 0.004, -0.015, 0.009, 0.003, -0.005, 0.011, -0.002, 0.007, 0.001, -0.009,
  0.014, -0.004, 0.008, 0.002, -0.011, 0.005, 0.01, -0.006, 0.003, 0.007, -0.003, 0.009, -0.012,
  0.004, 0.006, -0.001, 0.008,
] as const;

function buildDemoBars(count = 320): BacktestBar[] {
  let price = 100;
  const bars: BacktestBar[] = [];
  const start = Date.UTC(2020, 0, 2);
  for (let i = 0; i < count; i += 1) {
    const r = DEMO_RETURNS[i % DEMO_RETURNS.length]!;
    const open = price;
    const close = Number((price * (1 + r)).toFixed(4));
    const high = Math.max(open, close) * 1.004;
    const low = Math.min(open, close) * 0.996;
    bars.push({
      open,
      high,
      low,
      close,
      volume: 1_000_000 + (i % 7) * 50_000,
      date: new Date(start + i * 86_400_000).toISOString(),
    });
    price = close;
  }
  return bars;
}

export function horizonToYahoo(
  horizon: BacktestHorizon,
): { interval: YahooChartInterval; range: string; periodsPerYear: number } {
  switch (horizon) {
    case "intraday":
      // Yahoo typically caps 1m/5m history; 5m×60d is the practical short-term window.
      return { interval: "5m", range: "60d", periodsPerYear: 252 * 78 };
    case "swing":
      return { interval: "1d", range: "2y", periodsPerYear: 252 };
    case "daily5y":
    default:
      return { interval: "1d", range: "5y", periodsPerYear: 252 };
  }
}

export async function loadBacktestHistory(
  symbol: string,
  horizon: BacktestHorizon = "daily5y",
): Promise<HistoryLoadResult> {
  const sym = symbol.trim().toUpperCase() || "DEMO";
  const { interval, range, periodsPerYear } = horizonToYahoo(horizon);
  void periodsPerYear;

  if (sym === "DEMO" || !isYahooFinanceEnabled()) {
    return {
      bars: buildDemoBars(horizon === "intraday" ? 480 : 320),
      dataLabel: "DEMO",
      interval,
      range,
      note:
        sym === "DEMO"
          ? "DEMO synthetic OHLCV — offline advanced backtest."
          : "Yahoo Finance disabled (USE_YAHOO_FINANCE=false) — DEMO path.",
    };
  }

  try {
    let bars = await getChartBars(sym, interval, range);
    // Fallback: if intraday empty, try 60m then daily.
    if (bars.length < 40 && horizon === "intraday") {
      bars = await getChartBars(sym, "60m", "1mo");
      if (bars.length >= 40) {
        return {
          bars,
          dataLabel: "YAHOO",
          interval: "60m",
          range: "1mo",
          note: `Yahoo 60m fallback (${bars.length} bars) — 5m unavailable.`,
        };
      }
      bars = await getChartBars(sym, "1d", "2y");
    }
    if (bars.length < 40) {
      return {
        bars: buildDemoBars(),
        dataLabel: "DEMO",
        interval,
        range,
        note: `Yahoo returned ${bars.length} bars for ${sym} — DEMO fallback.`,
      };
    }
    return {
      bars,
      dataLabel: "YAHOO",
      interval,
      range,
      note: `Yahoo ${interval}/${range} · ${bars.length} bars (~${horizon}).`,
    };
  } catch (err) {
    return {
      bars: buildDemoBars(),
      dataLabel: "DEMO",
      interval,
      range,
      note: `Yahoo fetch failed (${err instanceof Error ? err.message : "error"}) — DEMO fallback.`,
    };
  }
}
