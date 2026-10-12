/**
 * Shared backtest PnL / equity / fill logic — used by scripts/crypto-backtest.ts + tests.
 * No lookahead: signal on closed bar i; entry on later bar; exit after entry bar.
 */

import type { Bar } from "@/lib/brokers/kraken/market-store";

export const BT_MAKER = 0.0025;
export const BT_TAKER = 0.004;

export type BacktestExitKind = "take_profit" | "stop" | "timeout" | "signal";

export type SimulatedFill = {
  entry: number;
  exit: number;
  grossPct: number;
  netPct: number;
  mfePct: number;
  maePct: number;
  exitKind: BacktestExitKind;
};

/** Round-trip cost as fraction of notional (maker entry + taker exit + spread). */
export function roundTripCostFraction(spreadPct = 0.001): number {
  return BT_MAKER + BT_TAKER + Math.max(0, spreadPct) * 2;
}

/**
 * Net P&L % of notional from entry→exit prices.
 * Fees are fractions of notional (not of price incorrectly scaled).
 */
export function netPnlPctFromPrices(
  entry: number,
  exit: number,
  opts?: { entryFee?: number; exitFee?: number; spreadPct?: number },
): number {
  if (!(entry > 0)) return 0;
  const gross = (exit - entry) / entry;
  const fees =
    (opts?.entryFee ?? BT_MAKER) +
    (opts?.exitFee ?? BT_TAKER) +
    Math.max(0, opts?.spreadPct ?? 0) * 2;
  return (gross - fees) * 100;
}

/**
 * Compound equity curve MaxDD as % of peak (0–100).
 * Starts at 100; each trade applies netPct as relative return.
 */
export function compoundMaxDrawdownPct(netPctSeries: readonly number[]): number {
  let equity = 100;
  let peak = 100;
  let maxDd = 0;
  for (const netPct of netPctSeries) {
    equity *= 1 + netPct / 100;
    if (!(equity > 0)) equity = 1e-9;
    peak = Math.max(peak, equity);
    const dd = ((peak - equity) / peak) * 100;
    maxDd = Math.max(maxDd, Math.min(100, dd));
  }
  return maxDd;
}

/**
 * Simulate long: entry at `entryPrice` on entryBarIndex.
 * Stop/TP checked from entryBarIndex+1 onward (never same bar as entry without path).
 * If both hit same bar → assume worst case (stop first).
 */
export function simulateLongTrade(params: {
  bars: readonly Bar[];
  entryBarIndex: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  maxBars: number;
}): SimulatedFill | null {
  const { bars, entryBarIndex, entryPrice, stopLoss, takeProfit, maxBars } =
    params;
  if (!(entryPrice > 0) || entryBarIndex < 0 || entryBarIndex >= bars.length - 1) {
    return null;
  }
  let mfe = 0;
  let mae = 0;
  let exit = entryPrice;
  let exitKind: BacktestExitKind = "timeout";
  const last = Math.min(bars.length - 1, entryBarIndex + maxBars);
  // Path discovery starts on the bar AFTER entry fill
  for (let j = entryBarIndex + 1; j <= last; j++) {
    const b = bars[j]!;
    mfe = Math.max(mfe, (b.high - entryPrice) / entryPrice);
    mae = Math.min(mae, (b.low - entryPrice) / entryPrice);
    const hitStop = b.low <= stopLoss;
    const hitTp = b.high >= takeProfit;
    if (hitStop && hitTp) {
      exit = stopLoss;
      exitKind = "stop";
      break;
    }
    if (hitStop) {
      exit = stopLoss;
      exitKind = "stop";
      break;
    }
    if (hitTp) {
      exit = takeProfit;
      exitKind = "take_profit";
      break;
    }
    if (j === last) {
      exit = b.close;
      exitKind = "timeout";
    }
  }
  const netPct = netPnlPctFromPrices(entryPrice, exit);
  return {
    entry: entryPrice,
    exit,
    grossPct: ((exit - entryPrice) / entryPrice) * 100,
    netPct,
    mfePct: mfe * 100,
    maePct: mae * 100,
    exitKind,
  };
}

/**
 * Limit buy fill: after signal bar, first later bar whose low <= limit.
 * Entry price = limit (maker). Never fills on signal bar.
 */
export function findLimitBuyFill(
  bars: readonly Bar[],
  signalBarIndex: number,
  limitPrice: number,
  maxWaitBars = 12,
): { entryBarIndex: number; entryPrice: number } | null {
  if (!(limitPrice > 0)) return null;
  const end = Math.min(bars.length - 1, signalBarIndex + maxWaitBars);
  for (let j = signalBarIndex + 1; j <= end; j++) {
    if (bars[j]!.low <= limitPrice) {
      return { entryBarIndex: j, entryPrice: limitPrice };
    }
  }
  return null;
}

/** Range from closed bars strictly before signal index (no lookahead). */
export function priorRange(
  bars: readonly Bar[],
  signalBarIndex: number,
  lookback: number,
): { hi: number; lo: number } | null {
  if (signalBarIndex < 1) return null;
  const from = Math.max(0, signalBarIndex - lookback);
  const slice = bars.slice(from, signalBarIndex); // exclude signal bar
  if (slice.length < 8) return null;
  const hi = Math.max(...slice.map((b) => b.high));
  const lo = Math.min(...slice.map((b) => b.low));
  if (!(hi > lo)) return null;
  return { hi, lo };
}

export function liquidityBucket(volEur: number): ">5M" | "1-5M" | "0.3-1M" {
  if (volEur > 5_000_000) return ">5M";
  if (volEur > 1_000_000) return "1-5M";
  return "0.3-1M";
}
