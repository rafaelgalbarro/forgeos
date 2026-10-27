/**
 * Extra Kraken Futures strategies from forum / published research (owner decision: live from the
 * first minute; exchange stop + take-profit on every order, daily risk brake still applies).
 *
 *  BTC_SEASONAL_22UTC  — long 22:00 UTC, flat after 2 h (Quantpedia "intraday seasonality in
 *                        Bitcoin"); BTC, ETH, SOL.
 *  RSI2_TREND_1H / _15M — close > SMA200 & RSI(2) < 10 → long; close < SMA200 & RSI(2) > 90 →
 *                        short. Stop 2 ATR, small target 1 ATR, time exit 24 bars.
 *  FUNDING_REVERSAL_1H — funding extremely positive (crowded longs) → short; extremely negative →
 *                        long. Stop 2 ATR, target 2 ATR, time exit 8 h.
 */

import type { Bar } from "@/lib/brokers/kraken/market-store";
import type { CryptoStrategyId, CryptoStrategySignal } from "./types";

export const FUTURES_EXTRA_STRATEGY_IDS = [
  "BTC_SEASONAL_22UTC",
  "RSI2_TREND_1H",
  "RSI2_TREND_15M",
  "FUNDING_REVERSAL_1H",
] as const;
export const FUTURES_EXTRA_SET: ReadonlySet<string> = new Set(FUTURES_EXTRA_STRATEGY_IDS);

function closed(bars: readonly Bar[], tfSec: number, nowSec: number): Bar[] {
  const last = bars[bars.length - 1];
  return last && last.time + tfSec > nowSec ? bars.slice(0, -1) : [...bars];
}

function atr(b: readonly Bar[], n = 14): number | null {
  if (b.length < n + 2) return null;
  const tr = (k: number) => Math.max(b[k]!.high - b[k]!.low, Math.abs(b[k]!.high - b[k - 1]!.close), Math.abs(b[k]!.low - b[k - 1]!.close));
  let a = 0;
  for (let k = 1; k <= n; k += 1) a += tr(k);
  a /= n;
  for (let k = n + 1; k < b.length; k += 1) a = (a * (n - 1) + tr(k)) / n;
  return a;
}

function rsi2(c: readonly number[]): number | null {
  if (c.length < 10) return null;
  let g = 0; let l = 0;
  for (let k = 1; k <= 2; k += 1) { const d = c[k]! - c[k - 1]!; if (d >= 0) g += d; else l -= d; }
  g /= 2; l /= 2;
  for (let k = 3; k < c.length; k += 1) { const d = c[k]! - c[k - 1]!; g = (g + Math.max(d, 0)) / 2; l = (l + Math.max(-d, 0)) / 2; }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

function signal(id: string, dir: "BUY" | "SELL", entry: number, stop: number, tp: number, a: number, maxHoldMs: number, candleTime: number, reasoning: string): CryptoStrategySignal {
  const stopPct = Math.abs(entry - stop) / entry;
  return {
    strategyId: id as CryptoStrategyId,
    direction: dir,
    confidence: 0.6,
    reasoning,
    entry,
    stopLoss: stop,
    takeProfit: tp,
    expectedMovePct: Math.abs(tp - entry) / entry,
    maxHoldMs,
    atr: a,
    stopLossPct: stopPct,
    riskR: 1,
    candleTime,
  };
}

export function evaluateSeasonal22(pair: string, bars1h: readonly Bar[], now = new Date()): CryptoStrategySignal | null {
  if (!["XBTEUR", "ETHEUR", "SOLEUR"].includes(pair.toUpperCase())) return null;
  if (now.getUTCHours() !== 22 || now.getUTCMinutes() >= 30) return null;
  const b = closed(bars1h, 3600, Math.floor(now.getTime() / 1000));
  const a = atr(b);
  const px = b[b.length - 1]?.close;
  if (!a || !px) return null;
  const t22 = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22) / 1000);
  return signal("BTC_SEASONAL_22UTC", "BUY", px, px - 2 * a, px + 3 * a, a, 2 * 3600_000, t22, "estacionalidad 22:00 UTC (2 h)");
}

export function evaluateRsi2Trend(id: "RSI2_TREND_1H" | "RSI2_TREND_15M", bars: readonly Bar[], tfSec: number, now = new Date()): CryptoStrategySignal | null {
  const b = closed(bars, tfSec, Math.floor(now.getTime() / 1000));
  if (b.length < 210) return null;
  const c = b.map((x) => x.close);
  const s200 = c.slice(-200).reduce((s, x) => s + x, 0) / 200;
  const r = rsi2(c.slice(-120));
  const a = atr(b.slice(-60));
  const px = c[c.length - 1]!;
  if (r == null || !a) return null;
  const t = b[b.length - 1]!.time;
  if (px > s200 && r < 10) return signal(id, "BUY", px, px - 2 * a, px + a, a, 24 * tfSec * 1000, t, `RSI2 ${r.toFixed(0)} en tendencia alcista`);
  if (px < s200 && r > 90) return signal(id, "SELL", px, px + 2 * a, px - a, a, 24 * tfSec * 1000, t, `RSI2 ${r.toFixed(0)} en tendencia bajista`);
  return null;
}

/** relFundingPerHour: Kraken relative funding rate per hour (fraction). */
export function evaluateFundingReversal(bars1h: readonly Bar[], relFundingPerHour: number | null, now = new Date()): CryptoStrategySignal | null {
  if (relFundingPerHour == null || !Number.isFinite(relFundingPerHour)) return null;
  const TH = Number(process.env.FUTURES_FUNDING_EXTREME ?? 0.0001); // 0.01 %/h ≈ 0.24 %/día
  if (Math.abs(relFundingPerHour) < TH) return null;
  const b = closed(bars1h, 3600, Math.floor(now.getTime() / 1000));
  const a = atr(b.slice(-60));
  const px = b[b.length - 1]?.close;
  if (!a || !px) return null;
  const t = b[b.length - 1]!.time;
  const pct = (relFundingPerHour * 100).toFixed(3);
  if (relFundingPerHour > 0) return signal("FUNDING_REVERSAL_1H", "SELL", px, px + 2 * a, px - 2 * a, a, 8 * 3600_000, t, `funding ${pct}%/h: largos saturados`);
  return signal("FUNDING_REVERSAL_1H", "BUY", px, px - 2 * a, px + 2 * a, a, 8 * 3600_000, t, `funding ${pct}%/h: cortos saturados`);
}
