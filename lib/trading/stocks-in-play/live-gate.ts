import fs from "node:fs";
import path from "node:path";
import {
  STOCKS_IN_PLAY_MIN_PROFIT_FACTOR,
  STOCKS_IN_PLAY_MIN_SHADOW_CLOSED,
} from "@/lib/trading/stocks-in-play/config";
import { forgeosCacheFile } from "@/lib/trading/crypto/forgeos-cache";
import type { StocksInPlayBacktestReport } from "@/lib/trading/stocks-in-play/types";
import { loadInPlayShadowStats } from "@/lib/trading/stocks-in-play/shadow-journal";

export function stocksInPlayBacktestReportPath(): string {
  return forgeosCacheFile("stocks-in-play-backtest-latest.json");
}

export function loadStocksInPlayBacktestReport(): StocksInPlayBacktestReport | null {
  try {
    const p = stocksInPlayBacktestReportPath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as StocksInPlayBacktestReport;
  } catch {
    return null;
  }
}

export function persistStocksInPlayBacktestReport(report: StocksInPlayBacktestReport): string {
  const p = stocksInPlayBacktestReportPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2), "utf8");
  return p;
}

/** In-play live only — RUNNERS use STOCKS_RUNNERS_MODE separately. */
export function stocksInPlayLiveGate(): { ok: boolean; reason?: string } {
  const bt = loadStocksInPlayBacktestReport();
  if (!bt?.liveEligible) {
    return { ok: false, reason: bt?.ineligibleReason ?? "no_backtest_report_or_ineligible" };
  }
  const shadow = loadInPlayShadowStats();
  if (shadow.closed < STOCKS_IN_PLAY_MIN_SHADOW_CLOSED) {
    return { ok: false, reason: `shadow_closed=${shadow.closed}<${STOCKS_IN_PLAY_MIN_SHADOW_CLOSED}` };
  }
  if (!(shadow.meanNetUsd > 0)) {
    return { ok: false, reason: `shadow_mean_net=${shadow.meanNetUsd.toFixed(2)}<=0` };
  }
  if (!(shadow.profitFactor > STOCKS_IN_PLAY_MIN_PROFIT_FACTOR)) {
    return { ok: false, reason: `shadow_pf=${shadow.profitFactor.toFixed(2)}<=${STOCKS_IN_PLAY_MIN_PROFIT_FACTOR}` };
  }
  return { ok: true };
}
