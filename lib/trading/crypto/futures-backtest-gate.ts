/**
 * Live futures activation gate from latest persisted OOS backtest report.
 */

import { futuresExtraLive, isFuturesExtraStrategy } from "@/lib/trading/crypto/futures-config";
import fs from "node:fs";
import path from "node:path";

const MIN_OOS_TRADES = 20;
const MIN_PROFIT_FACTOR = 1.2;

export type FuturesBacktestGateRow = {
  strategyId: string;
  direction: "long" | "short";
  pair: string;
  oosTrades: number;
  meanNetPct: number;
  profitFactor: number;
  zeroReason?: string;
  liveEligible: boolean;
  ineligibleReason?: string;
};

export type FuturesBacktestReport = {
  generatedAt: string;
  isDays: number;
  oosDays: number;
  pairs: string[];
  fees: { makerPct: number; takerPct: number };
  rows: FuturesBacktestGateRow[];
  /** Key: `${strategyId}|${direction}` */
  gates: Record<string, { eligible: boolean; reason?: string }>;
};

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

export function futuresBacktestReportPath(): string {
  return path.join(forgeosRoot(), ".forgeos", "reports", "futures-backtest-latest.json");
}

export function loadLatestFuturesBacktestReport(): FuturesBacktestReport | null {
  try {
    const p = futuresBacktestReportPath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as FuturesBacktestReport;
  } catch {
    return null;
  }
}

export function persistFuturesBacktestReport(report: FuturesBacktestReport): string {
  const p = futuresBacktestReportPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2), "utf8");
  return p;
}

export function gateKey(strategyId: string, direction: "long" | "short"): string {
  return `${strategyId.trim().toUpperCase()}|${direction}`;
}

export function evaluateOosLiveEligibility(params: {
  oosTrades: number;
  meanNetPct: number;
  profitFactor: number;
}): { eligible: boolean; reason?: string } {
  if (params.oosTrades < MIN_OOS_TRADES) {
    return {
      eligible: false,
      reason: `oos_trades=${params.oosTrades}<${MIN_OOS_TRADES}`,
    };
  }
  if (!(params.meanNetPct > 0)) {
    return { eligible: false, reason: `mean_net=${params.meanNetPct.toFixed(3)}<=0` };
  }
  if (!(params.profitFactor > MIN_PROFIT_FACTOR)) {
    return {
      eligible: false,
      reason: `pf=${params.profitFactor.toFixed(2)}<=${MIN_PROFIT_FACTOR}`,
    };
  }
  return { eligible: true };
}

/** Engine live gate — env list alone is not sufficient. */
export function futuresLiveGateForStrategy(
  strategyId: string,
  direction: "long" | "short",
): { ok: boolean; reason?: string } {
  // Forum strategies live by owner decision (no backtest gate); FUTURES_EXTRA_LIVE=false disables.
  if (isFuturesExtraStrategy(strategyId) && futuresExtraLive()) return { ok: true };
  const report = loadLatestFuturesBacktestReport();
  if (!report) return { ok: false, reason: "no_backtest_report" };
  const g = report.gates[gateKey(strategyId, direction)];
  if (!g) return { ok: false, reason: "missing_gate_row" };
  if (!g.eligible) return { ok: false, reason: g.reason ?? "ineligible" };
  return { ok: true };
}

export function profitFactorFromNetPcts(netPcts: number[]): number {
  let wins = 0;
  let losses = 0;
  for (const n of netPcts) {
    if (n > 0) wins += n;
    else if (n < 0) losses += Math.abs(n);
  }
  if (losses <= 0) return wins > 0 ? 99 : 0;
  return wins / losses;
}
