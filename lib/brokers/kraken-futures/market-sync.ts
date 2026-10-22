/**
 * Sync Kraken Futures PF_* prices/candles into spot-pair market-store for strategy eval.
 */

import "server-only";

import type { FuturesBar } from "./adapter";
import { getKrakenFuturesAdapter } from "./adapter";
import { pfSymbolToSpotPair, spotPairToPfSymbol } from "./instruments";
import {
  getBars,
  setBars,
  setTicker,
  upsertBar,
  type Bar,
  type Tf,
} from "@/lib/brokers/kraken/market-store";

function futuresCandleToBar(c: FuturesBar): Bar | null {
  const ts = Date.parse(c.time);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return {
    time: Math.floor(ts / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  };
}

export function applyFuturesMarkTick(
  spotPair: string,
  price: number,
  timeSec: number,
): void {
  if (!(price > 0) || !(timeSec > 0)) return;
  for (const mins of [5, 15, 60] as const) {
    const bucket = Math.floor(timeSec / (mins * 60)) * (mins * 60);
    const tf = String(mins) as Tf;
    const list = getBars(spotPair, tf);
    const last = list[list.length - 1];
    if (last && last.time === bucket) {
      upsertBar(spotPair, tf, {
        time: bucket,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
        volume: last.volume,
      });
    } else {
      upsertBar(spotPair, tf, {
        time: bucket,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
      });
    }
  }
}

export function ingestFuturesWsTicker(
  pfSymbol: string,
  snap: { bid: number; ask: number; mark: number },
): void {
  const spot = pfSymbolToSpotPair(pfSymbol);
  if (!spot) return;
  const now = Date.now();
  const mid =
    snap.bid > 0 && snap.ask > 0
      ? (snap.bid + snap.ask) / 2
      : snap.mark > 0
        ? snap.mark
        : 0;
  if (!(mid > 0)) return;
  setTicker(spot, {
    bid: snap.bid > 0 ? snap.bid : mid,
    ask: snap.ask > 0 ? snap.ask : mid,
    last: mid,
    mid,
    volume24h: 0,
    vwap: mid,
    high24h: mid,
    low24h: mid,
    changePct24h: 0,
    updatedAt: now,
  });
  applyFuturesMarkTick(spot, snap.mark > 0 ? snap.mark : mid, Math.floor(now / 1000));
}

/** Bars kept per timeframe after backfill (strategies need ≥60–120; store caps at 300). */
export const FUTURES_BACKFILL_BARS = 300;

export type FuturesBackfillResult = {
  pair: string;
  pf: string | null;
  bars: Partial<Record<Tf, number>>;
  error?: string;
};

export async function backfillFuturesSpotPair(spotPair: string): Promise<FuturesBackfillResult> {
  const pf = spotPairToPfSymbol(spotPair);
  const out: FuturesBackfillResult = { pair: spotPair, pf, bars: {} };
  if (!pf) return { ...out, error: "no_pf" };
  const adapter = getKrakenFuturesAdapter();
  const errors: string[] = [];
  for (const [mins, tf] of [
    [5, "5"],
    [15, "15"],
    [60, "60"],
  ] as const) {
    try {
      const candles = await adapter.getCandles(pf, mins, undefined, FUTURES_BACKFILL_BARS);
      const fresh = candles
        .map(futuresCandleToBar)
        .filter((b): b is Bar => b != null);
      if (fresh.length) {
        // Merge: REST history + newer live (WS-built) bars, newest wins per bucket.
        const byTime = new Map<number, Bar>();
        for (const b of fresh) byTime.set(b.time, b);
        for (const b of getBars(spotPair, tf)) {
          if (b.time >= fresh[fresh.length - 1]!.time) byTime.set(b.time, b);
        }
        setBars(
          spotPair,
          tf,
          [...byTime.values()].sort((a, b) => a.time - b.time).slice(-FUTURES_BACKFILL_BARS),
        );
      }
      out.bars[tf] = getBars(spotPair, tf).length;
    } catch (err) {
      errors.push(`${tf}m:${err instanceof Error ? err.message : String(err)}`);
      out.bars[tf] = getBars(spotPair, tf).length;
    }
  }
  const q = await adapter.getQuote(pf).catch(() => null);
  if (q && q.mid > 0) {
    ingestFuturesWsTicker(pf, { bid: q.bid, ask: q.ask, mark: q.mark });
  }
  if (errors.length) out.error = errors.join("; ").slice(0, 300);
  return out;
}

export async function backfillFuturesUniverse(
  spotPairs: readonly string[],
  opts?: { delayMs?: number },
): Promise<FuturesBackfillResult[]> {
  const delayMs = opts?.delayMs ?? 180;
  const results: FuturesBackfillResult[] = [];
  for (const pair of spotPairs) {
    const r = await backfillFuturesSpotPair(pair).catch((err) => ({
      pair,
      pf: null,
      bars: {},
      error: err instanceof Error ? err.message : String(err),
    }));
    results.push(r);
    if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
  }
  const ok = results.filter((r) => !r.error && (r.bars["60"] ?? 0) >= 60).length;
  const minBars = (tf: Tf) =>
    results.length ? Math.min(...results.map((r) => r.bars[tf] ?? 0)) : 0;
  console.log(
    `[Kraken/Futures/REST] backfill 5/15/1h universe: ok=${ok} total=${spotPairs.length} ` +
      `minBars 5m=${minBars("5")} 15m=${minBars("15")} 1h=${minBars("60")}`,
  );
  const failed = results.filter((r) => r.error).slice(0, 3);
  for (const f of failed) {
    console.warn(`[Kraken/Futures/REST] backfill ${f.pf ?? f.pair} error: ${f.error}`);
  }
  return results;
}
