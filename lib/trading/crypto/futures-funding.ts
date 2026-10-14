/**
 * Live + journal funding accrual for Kraken Futures positions.
 */

import "server-only";

import { estimateFundingPct } from "@/lib/trading/crypto/backtest-futures-core";

export function fundingRateAtTime(
  series: readonly { time: number; rate: number }[],
  unixSec: number,
): number {
  if (!series.length) return 0;
  let rate = series[0]!.rate;
  for (const row of series) {
    if (row.time > unixSec) break;
    rate = row.rate;
  }
  return rate;
}

/** EUR paid (+) or received (−) over hold period. */
export function accrueFundingEur(params: {
  notionalEur: number;
  fundingRate8h: number;
  holdMs: number;
  side: "long" | "short";
}): number {
  const holdHours = Math.max(0, params.holdMs / 3_600_000);
  const frac = estimateFundingPct(params.fundingRate8h, holdHours, params.side);
  return params.notionalEur * frac;
}

export function futuresCloseGrossEur(params: {
  entry: number;
  exit: number;
  qty: number;
  side: "long" | "short";
}): number {
  const { entry, exit, qty } = params;
  if (params.side === "short") return (entry - exit) * qty;
  return (exit - entry) * qty;
}
