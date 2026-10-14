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

export async function backfillFuturesSpotPair(spotPair: string): Promise<void> {
  const pf = spotPairToPfSymbol(spotPair);
  if (!pf) return;
  const adapter = getKrakenFuturesAdapter();
  for (const [mins, tf] of [
    [5, "5"],
    [15, "15"],
    [60, "60"],
  ] as const) {
    const candles = await adapter.getCandles(pf, mins).catch(() => []);
    const bars = candles
      .map(futuresCandleToBar)
      .filter((b): b is Bar => b != null)
      .sort((a, b) => a.time - b.time);
    if (bars.length) setBars(spotPair, tf, bars);
  }
  const q = await adapter.getQuote(pf).catch(() => null);
  if (q && q.mid > 0) {
    ingestFuturesWsTicker(pf, { bid: q.bid, ask: q.ask, mark: q.mark });
  }
}

export async function backfillFuturesUniverse(
  spotPairs: readonly string[],
  opts?: { delayMs?: number },
): Promise<void> {
  const delayMs = opts?.delayMs ?? 180;
  let ok = 0;
  for (const pair of spotPairs) {
    await backfillFuturesSpotPair(pair).catch(() => undefined);
    ok += 1;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  console.log(
    `[Kraken/Futures/REST] backfill 5/15/1h universe: ok=${ok} total=${spotPairs.length}`,
  );
}
