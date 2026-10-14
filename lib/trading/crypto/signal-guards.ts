/**
 * Shared entry guards: max stop distance, shadow sim sizing, exit fee model.
 */

import { cryptoLiveMaxNotionalEur } from "@/lib/trading/crypto/config";
import { getMakerFeePct, getTakerFeePct } from "@/lib/trading/crypto/fee-schedule";
import type { CryptoStrategySignal } from "@/lib/trading/crypto/strategies/types";

const MAX_STOP_FRAC = 0.04;

/** Discard BUY when technical stop is farther than min(4%, 2×ATR/entry). */
export function applyStopDistanceCap(
  signal: CryptoStrategySignal,
): CryptoStrategySignal | null {
  if (signal.direction !== "BUY") return signal;
  if (!(signal.entry > 0) || !(signal.stopLoss > 0)) return signal;
  const distPct = (signal.entry - signal.stopLoss) / signal.entry;
  const atrCap =
    signal.atr > 0 ? (2 * signal.atr) / signal.entry : MAX_STOP_FRAC;
  const maxPct = Math.min(MAX_STOP_FRAC, atrCap > 0 ? atrCap : MAX_STOP_FRAC);
  if (distPct > maxPct + 1e-9) return null;
  return signal;
}

/** Qty for shadow journal sim — matches CRYPTO_LIVE_MAX_NOTIONAL_EUR. */
export function shadowSimQty(entryPrice: number): number {
  const cap = cryptoLiveMaxNotionalEur();
  if (!(entryPrice > 0) || !(cap > 0)) return 0;
  return cap / entryPrice;
}

/** Maker on TP, taker on stop/time/max-hold (fraction of notional EUR). */
export function shadowExitFeesEur(params: {
  entry: number;
  exit: number;
  qty: number;
  pair: string;
  exitReason: string;
}): number {
  const notionalEntry = params.entry * params.qty;
  const notionalExit = params.exit * params.qty;
  if (!(notionalEntry > 0) || !(notionalExit > 0)) return 0;
  const maker = getMakerFeePct(params.pair);
  const taker = getTakerFeePct(params.pair);
  const entryFee = notionalEntry * maker;
  const exitFee =
    params.exitReason === "TAKE_PROFIT"
      ? notionalExit * maker
      : notionalExit * taker;
  return entryFee + exitFee;
}

/** Shadow close rows with absurd PnL vs sim notional (legacy qty=1). */
export function isShadowStatsValid(trade: {
  shadow?: boolean;
  side?: string;
  netPnlEur?: number | null;
  netPct?: number | null;
  qty?: number | null;
  entry?: number;
}): boolean {
  if (!trade.shadow || trade.side !== "SELL") return true;
  const cap = cryptoLiveMaxNotionalEur();
  const net = trade.netPnlEur ?? 0;
  if (Math.abs(net) > cap * 0.6) return false;
  if (trade.netPct != null && Math.abs(trade.netPct) > 25) return false;
  return true;
}
