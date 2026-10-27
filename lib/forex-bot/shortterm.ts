/**
 * Short-term rules taken from forum / published sources (owner decision: live from minute one,
 * no backtest gate; protected by broker stops, the daily brake and the live kill switch).
 *
 * E1 — EUR/USD Asian-session mean reversion (M15), 00:00–06:00 UTC:
 *      close outside Bollinger(20,2) with RSI14 < 25 (long) / > 75 (short) → market entry,
 *      stop 1.5 ATR beyond the close, target = Bollinger middle (SMA20), time exit 12 bars.
 * G1 — Gold mean reversion (H1), ADX14 < 25:
 *      bar i−1 closes outside Bollinger(20,2) with RSI14 > 75 (short) / < 25 (long);
 *      bar i is a reversal candle (opposite colour, closes beyond bar i−1's close) → market entry;
 *      stop beyond the 3-bar extreme + 0.1 ATR, target EMA20, time exit 6 bars.
 */

import type { FxCandle, FxSide } from "./types";

export type StSignal = { side: FxSide; stop: number; target: number; maxBars: number; reason: string };

function sma(v: number[], n: number, i: number): number | null {
  if (i + 1 < n) return null;
  let s = 0;
  for (let k = i - n + 1; k <= i; k += 1) s += v[k]!;
  return s / n;
}
function sd(v: number[], n: number, i: number, m: number): number {
  let q = 0;
  for (let k = i - n + 1; k <= i; k += 1) q += (v[k]! - m) ** 2;
  return Math.sqrt(q / n);
}
function rsiAt(v: number[], n: number, i: number): number | null {
  if (i < n + 1) return null;
  let g = 0; let l = 0;
  for (let k = 1; k <= n; k += 1) { const d = v[k]! - v[k - 1]!; if (d >= 0) g += d; else l -= d; }
  g /= n; l /= n;
  for (let k = n + 1; k <= i; k += 1) { const d = v[k]! - v[k - 1]!; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
function atrAt(b: readonly FxCandle[], n: number, i: number): number | null {
  if (i < n + 1) return null;
  const tr = (k: number) => Math.max(b[k]!.high - b[k]!.low, Math.abs(b[k]!.high - b[k - 1]!.close), Math.abs(b[k]!.low - b[k - 1]!.close));
  let a = 0;
  for (let k = 1; k <= n; k += 1) a += tr(k);
  a /= n;
  for (let k = n + 1; k <= i; k += 1) a = (a * (n - 1) + tr(k)) / n;
  return a;
}
function emaAt(v: number[], n: number, i: number): number | null {
  if (i + 1 < n) return null;
  let e = v.slice(0, n).reduce((s, x) => s + x, 0) / n;
  const k = 2 / (n + 1);
  for (let j = n; j <= i; j += 1) e = v[j]! * k + e * (1 - k);
  return e;
}
function adxAt(b: readonly FxCandle[], n: number, i: number): number | null {
  if (i < 3 * n) return null;
  let trS = 0; let pS = 0; let mS = 0; let adx = 0; const dx: number[] = [];
  for (let k = 1; k <= i; k += 1) {
    const h = b[k]!.high; const l = b[k]!.low; const pc = b[k - 1]!.close;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const up = h - b[k - 1]!.high; const dn = b[k - 1]!.low - l;
    const pdm = up > dn && up > 0 ? up : 0; const mdm = dn > up && dn > 0 ? dn : 0;
    if (k <= n) { trS += tr; pS += pdm; mS += mdm; if (k < n) continue; } else { trS = trS - trS / n + tr; pS = pS - pS / n + pdm; mS = mS - mS / n + mdm; }
    const p = trS > 0 ? (100 * pS) / trS : 0; const m = trS > 0 ? (100 * mS) / trS : 0;
    dx.push(p + m > 0 ? (100 * Math.abs(p - m)) / (p + m) : 0);
    if (dx.length === n) adx = dx.reduce((s, x) => s + x, 0) / n;
    else if (dx.length > n) adx = (adx * (n - 1) + dx[dx.length - 1]!) / n;
  }
  return dx.length >= n ? adx : null;
}

/** E1 on the last closed M15 bar. */
export function e1Signal(bars: readonly FxCandle[]): StSignal | null {
  const i = bars.length - 1;
  if (i < 60) return null;
  const h = new Date((bars[i]!.time + 900) * 1000).getUTCHours();
  if (h >= 6) return null; // Asian session only (00:00–06:00 UTC)
  const c = bars.map((b) => b.close);
  const m = sma(c, 20, i); const r = rsiAt(c, 14, i); const a = atrAt(bars, 14, i);
  if (m == null || r == null || a == null) return null;
  const s = sd(c, 20, i, m);
  if (c[i]! < m - 2 * s && r < 25) return { side: "long", stop: c[i]! - 1.5 * a, target: m, maxBars: 12, reason: `E1 Asia: cierre bajo Bollinger, RSI ${r.toFixed(0)}` };
  if (c[i]! > m + 2 * s && r > 75) return { side: "short", stop: c[i]! + 1.5 * a, target: m, maxBars: 12, reason: `E1 Asia: cierre sobre Bollinger, RSI ${r.toFixed(0)}` };
  return null;
}

/** G1 on the last closed H1 bar. */
export function g1Signal(bars: readonly FxCandle[]): StSignal | null {
  const i = bars.length - 1;
  if (i < 80) return null;
  const c = bars.map((b) => b.close);
  const adx = adxAt(bars, 14, i - 1);
  if (adx == null || adx >= 25) return null;
  const m = sma(c, 20, i - 1); const r = rsiAt(c, 14, i - 1); const a = atrAt(bars, 14, i); const e = emaAt(c, 20, i);
  if (m == null || r == null || a == null || e == null) return null;
  const s = sd(c, 20, i - 1, m);
  const prev = bars[i - 1]!; const cur = bars[i]!;
  const w = bars.slice(i - 2, i + 1);
  if (prev.close > m + 2 * s && r > 75 && cur.close < cur.open && cur.close < prev.close) {
    return { side: "short", stop: Math.max(...w.map((x) => x.high)) + 0.1 * a, target: e, maxBars: 6, reason: `G1 oro: RSI ${r.toFixed(0)} sobre Bollinger, vela de giro, ADX ${adx.toFixed(0)}` };
  }
  if (prev.close < m - 2 * s && r < 25 && cur.close > cur.open && cur.close > prev.close) {
    return { side: "long", stop: Math.min(...w.map((x) => x.low)) - 0.1 * a, target: e, maxBars: 6, reason: `G1 oro: RSI ${r.toFixed(0)} bajo Bollinger, vela de giro, ADX ${adx.toFixed(0)}` };
  }
  return null;
}
