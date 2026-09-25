/**
 * Crypto intraday strategies — Alpaca (default) or IBKR PAXOS via CRYPTO_BROKER.
 * Max hold 24h; SL 1.5×ATR(15m) capped 2%; TP 2R; BE after +1R; trail 1×ATR.
 */

import "server-only";

import type { OhlcvBar } from "@/lib/market-data/types";

export type CryptoStrategyId = "RSI_MEAN_REVERSION" | "TREND_PULLBACK_1H";

export type CryptoIntradaySignal = {
  direction: "BUY" | "HOLD";
  strategyId: CryptoStrategyId | null;
  confidence: number;
  reasoning: string;
  stopLoss: number;
  takeProfit: number;
  atr: number;
  stopLossPct: number;
  takeProfitPct: number;
  riskR: number;
};

export function getCryptoBroker(): "alpaca" | "ibkr" {
  const v = (process.env.CRYPTO_BROKER ?? "alpaca").trim().toLowerCase();
  return v === "ibkr" ? "ibkr" : "alpaca";
}

function closes(bars: readonly OhlcvBar[]): number[] {
  return bars.map((b) => b.close);
}

function ema(values: readonly number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i]! * k + prev * (1 - k);
  }
  return prev;
}

function rsi(values: readonly number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function atr(bars: readonly OhlcvBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let a = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trs.length; i += 1) {
    a = (a * (period - 1) + trs[i]!) / period;
  }
  return a > 0 ? a : null;
}

function hold(reason: string): CryptoIntradaySignal {
  return {
    direction: "HOLD",
    strategyId: null,
    confidence: 0,
    reasoning: reason,
    stopLoss: 0,
    takeProfit: 0,
    atr: 0,
    stopLossPct: 0,
    takeProfitPct: 0,
    riskR: 0,
  };
}

function levels(price: number, atr15: number): Omit<CryptoIntradaySignal, "direction" | "strategyId" | "confidence" | "reasoning"> {
  const stopDist = Math.min(atr15 * 1.5, price * 0.02);
  return {
    stopLoss: price - stopDist,
    takeProfit: price + stopDist * 2,
    atr: atr15,
    stopLossPct: stopDist / price,
    takeProfitPct: (stopDist * 2) / price,
    riskR: stopDist,
  };
}

export const CRYPTO_MAX_HOLD_MS = 24 * 60 * 60 * 1000;
export const CRYPTO_TRAIL_ATR_MULT = 1;
export const CRYPTO_BE_AT_R = 1;

export function evaluateCryptoIntradayStrategies(
  symbol: string,
  bars15m: readonly OhlcvBar[],
  bars1h: readonly OhlcvBar[],
): CryptoIntradaySignal {
  if (bars15m.length < 30) {
    return hold(`${symbol}: insuficientes barras 15m`);
  }
  const price = bars15m[bars15m.length - 1]!.close;
  const atr15 = atr(bars15m, 14);
  if (!(atr15 != null && price > 0)) return hold(`${symbol}: ATR/precio inválido`);

  const c15 = closes(bars15m);
  const rsi15 = rsi(c15, 14);
  const c1h = bars1h.length >= 30 ? closes(bars1h) : c15;
  const ema20_1h = ema(c1h, 20);
  const ema50_1h = ema(c1h, 50);
  const trend1hNotBear =
    ema20_1h != null && ema50_1h != null
      ? ema20_1h >= ema50_1h * 0.998
      : true;

  // RSI_MEAN_REVERSION: RSI 15m < 30, 1h trend not bearish
  if (rsi15 != null && rsi15 < 30 && trend1hNotBear) {
    return {
      direction: "BUY",
      strategyId: "RSI_MEAN_REVERSION",
      confidence: 0.72,
      reasoning: `RSI_MEAN_REVERSION: RSI15m=${rsi15.toFixed(0)} tendencia 1h no bajista`,
      ...levels(price, atr15),
    };
  }

  // TREND_PULLBACK_1H: EMA20 > EMA50 on 1h, pullback to EMA20
  if (ema20_1h != null && ema50_1h != null && ema20_1h > ema50_1h) {
    const last1h = c1h[c1h.length - 1]!;
    if (Math.abs(last1h - ema20_1h) / last1h <= 0.012) {
      return {
        direction: "BUY",
        strategyId: "TREND_PULLBACK_1H",
        confidence: 0.74,
        reasoning: `TREND_PULLBACK_1H: EMA20>EMA50 1h, retroceso a EMA20`,
        ...levels(price, atr15),
      };
    }
  }

  return hold(`${symbol}: sin setup crypto intradía`);
}
