/**
 * FX candles: OANDA when configured (closed mid candles), else EODHD 5m → M15.
 */

import "server-only";

import { fxBroker, oandaConfigured } from "./config";
import { mt5Candles, mt5Configured } from "./mt5";
import { aggregate } from "./indicators";
import { oandaCandles } from "./oanda";
import type { FxCandle } from "./types";

/** EUR_USD → EURUSD.FOREX */
export function eodhdFxSymbol(instrument: string): string {
  return `${instrument.replace("_", "").toUpperCase()}.FOREX`;
}

export async function eodhdIntraday5m(instrument: string, days: number): Promise<FxCandle[]> {
  const key = (process.env.EODHD_API_KEY ?? "").trim();
  if (!key) throw new Error("EODHD_API_KEY vacío");
  const base = (process.env.EODHD_BASE_URL ?? "https://eodhd.com/api").replace(/\/$/, "");
  const to = Math.floor(Date.now() / 1000);
  const out: FxCandle[] = [];
  // EODHD caps 5m requests to ~600 days; fetch in 30-day slices.
  for (let end = to; end > to - days * 86400; end -= 30 * 86400) {
    const from = Math.max(to - days * 86400, end - 30 * 86400);
    const url =
      `${base}/intraday/${encodeURIComponent(eodhdFxSymbol(instrument))}?interval=5m` +
      `&from=${from}&to=${end}&api_token=${encodeURIComponent(key)}&fmt=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`EODHD intraday HTTP ${res.status} ${instrument}`);
    const rows = (await res.json()) as Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume?: number }>;
    for (const r of rows ?? []) {
      if (!(r.close > 0)) continue;
      out.push({ time: r.timestamp, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume ?? 0 });
    }
  }
  const byTime = new Map<number, FxCandle>();
  for (const c of out) byTime.set(c.time, c);
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

/** Closed M15 candles (≥ `count`) and H1 candles derived the same way. */
export async function fxCandles(instrument: string, count = 400): Promise<{ m15: FxCandle[]; h1: FxCandle[]; source: string }> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (fxBroker() === "mt5" && mt5Configured()) {
    try {
      const [m15, h1] = await Promise.all([mt5Candles(instrument, "M15", count), mt5Candles(instrument, "H1", 200)]);
      if (m15.length >= 60) return { m15, h1, source: "MT5" };
    } catch {
      /* bridge down → fall back to EODHD below */
    }
  } else if (oandaConfigured()) {
    const [m15, h1] = await Promise.all([
      oandaCandles(instrument, "M15", count),
      oandaCandles(instrument, "H1", 200),
    ]);
    return { m15, h1, source: "OANDA" };
  }
  const m5 = await eodhdIntraday5m(instrument, 10);
  // Drop the forming buckets: only fully closed M15 / H1 bars.
  const m15 = aggregate(m5, 15).filter((b) => b.time + 900 <= nowSec);
  const h1 = aggregate(m5, 60).filter((b) => b.time + 3600 <= nowSec);
  return { m15: m15.slice(-count), h1: h1.slice(-200), source: "EODHD" };
}
