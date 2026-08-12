/**
 * RSI / MACD / Bollinger signal series for parameterizable backtests.
 */

import type { BacktestBar, BacktestSignalFamily, IndicatorParams } from "./types";

export type SignalAtBar = -1 | 0 | 1; // short/exit bias, flat, long entry bias

function emaSeries(values: readonly number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  const out: (number | null)[] = new Array(values.length).fill(null);
  out[period - 1] = prev;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out.map((v) => v ?? NaN);
}

function rsiAt(closes: readonly number[], end: number, period: number): number | null {
  if (end < period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = end - period + 1; i <= end; i += 1) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function bollingerAt(
  closes: readonly number[],
  end: number,
  period: number,
  mult: number,
): { upper: number; middle: number; lower: number } | null {
  if (end + 1 < period) return null;
  const slice = closes.slice(end - period + 1, end + 1);
  const middle = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: middle + mult * std, middle, lower: middle - mult * std };
}

export function defaultParams(family: BacktestSignalFamily, horizonMaxHold: number): IndicatorParams {
  switch (family) {
    case "rsi":
      return { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70, maxHoldBars: horizonMaxHold };
    case "macd":
      return { macdFast: 12, macdSlow: 26, macdSignal: 9, maxHoldBars: horizonMaxHold };
    case "bollinger":
      return { bbPeriod: 20, bbMult: 2, maxHoldBars: horizonMaxHold };
  }
}

/**
 * Build per-bar entry/exit signals (1 = enter/hold long, -1 = exit/avoid, 0 = neutral).
 * Long-only: we treat -1 as exit signal.
 */
export function buildSignalSeries(
  bars: readonly BacktestBar[],
  family: BacktestSignalFamily,
  params: IndicatorParams,
): SignalAtBar[] {
  const closes = bars.map((b) => b.close);
  const out: SignalAtBar[] = new Array(bars.length).fill(0);

  if (family === "rsi") {
    const period = params.rsiPeriod ?? 14;
    const oversold = params.rsiOversold ?? 30;
    const overbought = params.rsiOverbought ?? 70;
    for (let i = 1; i < closes.length; i += 1) {
      const rsi = rsiAt(closes, i, period);
      if (rsi == null) continue;
      if (rsi <= oversold) out[i] = 1;
      else if (rsi >= overbought) out[i] = -1;
    }
    return out;
  }

  if (family === "macd") {
    const fast = params.macdFast ?? 12;
    const slow = params.macdSlow ?? 26;
    const signalPeriod = params.macdSignal ?? 9;
    if (fast >= slow) return out;
    const emaFast = emaSeries(closes, fast);
    const emaSlow = emaSeries(closes, slow);
    const macdLine: number[] = closes.map((_, i) => {
      if (!Number.isFinite(emaFast[i]) || !Number.isFinite(emaSlow[i])) return NaN;
      return emaFast[i]! - emaSlow[i]!;
    });
    // Signal EMA on contiguous MACD values — approximate with emaSeries on cleaned series
    const cleanMacd = macdLine.map((v) => (Number.isFinite(v) ? v : 0));
    const signal = emaSeries(cleanMacd, signalPeriod);
    for (let i = 1; i < closes.length; i += 1) {
      if (!Number.isFinite(macdLine[i]) || !Number.isFinite(macdLine[i - 1])) continue;
      if (!Number.isFinite(signal[i]) || !Number.isFinite(signal[i - 1])) continue;
      const prevHist = macdLine[i - 1]! - signal[i - 1]!;
      const hist = macdLine[i]! - signal[i]!;
      if (prevHist <= 0 && hist > 0) out[i] = 1;
      else if (prevHist >= 0 && hist < 0) out[i] = -1;
    }
    return out;
  }

  // bollinger mean-reversion: buy lower band, sell upper band
  const period = params.bbPeriod ?? 20;
  const mult = params.bbMult ?? 2;
  for (let i = 0; i < closes.length; i += 1) {
    const bb = bollingerAt(closes, i, period, mult);
    if (!bb) continue;
    if (closes[i]! <= bb.lower) out[i] = 1;
    else if (closes[i]! >= bb.upper) out[i] = -1;
  }
  return out;
}
