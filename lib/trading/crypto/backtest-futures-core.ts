/**
 * Futures backtest fills — long/short, fees, funding accrual per 8h.
 */

import type { Bar } from "@/lib/brokers/kraken/market-store";
import {
  getBacktestMakerFee,
  getBacktestTakerFee,
  netPnlPctFromPrices,
  type BacktestExitKind,
  type SimulatedFill,
} from "@/lib/trading/crypto/backtest-core";

export const FUTURES_DEFAULT_MAKER = 0.0002;
export const FUTURES_DEFAULT_TAKER = 0.0005;

export function getFuturesBacktestMakerFee(accountMaker?: number): number {
  if (accountMaker != null && accountMaker > 0) return accountMaker;
  return FUTURES_DEFAULT_MAKER;
}

export function getFuturesBacktestTakerFee(accountTaker?: number): number {
  if (accountTaker != null && accountTaker > 0) return accountTaker;
  return FUTURES_DEFAULT_TAKER;
}

/** Funding paid (+) or received (−) as fraction of notional over holding period. */
export function estimateFundingPct(
  fundingRate8h: number,
  holdHours: number,
  side: "long" | "short",
): number {
  const periods = Math.max(0, holdHours / 8);
  const sign = side === "long" ? 1 : -1;
  return sign * fundingRate8h * periods;
}

export function simulateFuturesLongTrade(params: {
  bars: readonly Bar[];
  entryBarIndex: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  maxBars: number;
  makerFee?: number;
  takerFee?: number;
  fundingRate8h?: number;
  barMinutes?: number;
}): SimulatedFill | null {
  const maker = params.makerFee ?? getFuturesBacktestMakerFee();
  const taker = params.takerFee ?? getFuturesBacktestTakerFee();
  const { bars, entryBarIndex, entryPrice, stopLoss, takeProfit, maxBars } = params;
  if (!(entryPrice > 0) || entryBarIndex < 0 || entryBarIndex >= bars.length - 1) {
    return null;
  }
  let mfe = 0;
  let mae = 0;
  let exit = entryPrice;
  let exitKind: BacktestExitKind = "timeout";
  const last = Math.min(bars.length - 1, entryBarIndex + maxBars);
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
  const exitFee = exitKind === "take_profit" ? maker : taker;
  const gross = (exit - entryPrice) / entryPrice;
  const holdHours = ((last - entryBarIndex) * (params.barMinutes ?? 15)) / 60;
  const funding = estimateFundingPct(params.fundingRate8h ?? 0, holdHours, "long");
  const netPct = (gross - maker - exitFee - funding) * 100;
  return {
    entry: entryPrice,
    exit,
    grossPct: gross * 100,
    netPct,
    mfePct: mfe * 100,
    maePct: mae * 100,
    exitKind,
  };
}

export function simulateShortTrade(params: {
  bars: readonly Bar[];
  entryBarIndex: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  maxBars: number;
  makerFee?: number;
  takerFee?: number;
  fundingRate8h?: number;
  barMinutes?: number;
}): SimulatedFill | null {
  const { bars, entryBarIndex, entryPrice, stopLoss, takeProfit, maxBars } = params;
  if (!(entryPrice > 0) || entryBarIndex < 0 || entryBarIndex >= bars.length - 1) {
    return null;
  }
  let mfe = 0;
  let mae = 0;
  let exit = entryPrice;
  let exitKind: BacktestExitKind = "timeout";
  const last = Math.min(bars.length - 1, entryBarIndex + maxBars);
  for (let j = entryBarIndex + 1; j <= last; j++) {
    const b = bars[j]!;
    mfe = Math.max(mfe, (entryPrice - b.low) / entryPrice);
    mae = Math.min(mae, (entryPrice - b.high) / entryPrice);
    const hitStop = b.high >= stopLoss;
    const hitTp = b.low <= takeProfit;
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
  const maker = params.makerFee ?? getFuturesBacktestMakerFee();
  const taker = params.takerFee ?? getFuturesBacktestTakerFee();
  const exitFee = exitKind === "take_profit" ? maker : taker;
  const gross = (entryPrice - exit) / entryPrice;
  const holdHours = ((last - entryBarIndex) * (params.barMinutes ?? 15)) / 60;
  const funding = estimateFundingPct(params.fundingRate8h ?? 0, holdHours, "short");
  const netPct = (gross - maker - exitFee - funding) * 100;
  return {
    entry: entryPrice,
    exit,
    grossPct: gross * 100,
    netPct,
    mfePct: mfe * 100,
    maePct: mae * 100,
    exitKind,
  };
}

export function netFuturesPnlPct(
  direction: "long" | "short",
  entry: number,
  exit: number,
  opts?: {
    entryFee?: number;
    exitFee?: number;
    fundingRate8h?: number;
    holdHours?: number;
  },
): number {
  if (!(entry > 0)) return 0;
  const maker = opts?.entryFee ?? getFuturesBacktestMakerFee();
  const taker = opts?.exitFee ?? getFuturesBacktestTakerFee();
  if (direction === "long") {
    return netPnlPctFromPrices(entry, exit, { entryFee: maker, exitFee: taker });
  }
  const gross = (entry - exit) / entry;
  const fees = maker + taker;
  const funding = estimateFundingPct(
    opts?.fundingRate8h ?? 0,
    opts?.holdHours ?? 0,
    "short",
  );
  return (gross - fees - funding) * 100;
}

/** Spot vs futures fee comparison helper for reports. */
export function spotRoundTripPct(): number {
  return (getBacktestMakerFee() + getBacktestTakerFee()) * 100;
}

export function futuresRoundTripPct(maker?: number, taker?: number): number {
  return (
    (getFuturesBacktestMakerFee(maker) + getFuturesBacktestTakerFee(taker)) * 100
  );
}
