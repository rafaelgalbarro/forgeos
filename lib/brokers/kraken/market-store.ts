/**
 * In-memory market data store for Kraken (OHLC + ticker + book top).
 */

import "server-only";

export type Tf = "1" | "3" | "5" | "15" | "60" | "240";

export type Bar = {
  time: number; // unix sec
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TickerSnap = {
  bid: number;
  ask: number;
  last: number;
  mid: number;
  volume24h: number;
  vwap: number;
  high24h: number;
  low24h: number;
  changePct24h: number;
  updatedAt: number;
};

export type BookSnap = {
  bids: Array<{ price: number; qty: number }>;
  asks: Array<{ price: number; qty: number }>;
  updatedAt: number;
};

const MAX_BARS = 300;

type PairState = {
  bars: Partial<Record<Tf, Bar[]>>;
  /** Wall-clock ms when each TF bar series was last written. */
  barUpdatedAt: Partial<Record<Tf, number>>;
  ticker: TickerSnap | null;
  book: BookSnap | null;
};

const store = new Map<string, PairState>();

function norm(pair: string): string {
  return pair.trim().toUpperCase().replace("/", "");
}

function ensure(pair: string): PairState {
  const k = norm(pair);
  let s = store.get(k);
  if (!s) {
    s = { bars: {}, barUpdatedAt: {}, ticker: null, book: null };
    store.set(k, s);
  }
  if (!s.barUpdatedAt) s.barUpdatedAt = {};
  return s;
}

export function upsertBar(pair: string, tf: Tf, bar: Bar): void {
  const s = ensure(pair);
  const list = s.bars[tf] ?? [];
  const last = list[list.length - 1];
  if (last && last.time === bar.time) {
    list[list.length - 1] = bar;
  } else if (!last || bar.time > last.time) {
    list.push(bar);
  } else {
    const idx = list.findIndex((b) => b.time === bar.time);
    if (idx >= 0) list[idx] = bar;
    else {
      list.push(bar);
      list.sort((a, b) => a.time - b.time);
    }
  }
  while (list.length > MAX_BARS) list.shift();
  s.bars[tf] = list;
  s.barUpdatedAt[tf] = Date.now();
}

export function setBars(pair: string, tf: Tf, bars: Bar[]): void {
  const s = ensure(pair);
  s.bars[tf] = bars.slice(-MAX_BARS);
  if (bars.length) s.barUpdatedAt[tf] = Date.now();
}

export function getBars(pair: string, tf: Tf): Bar[] {
  return ensure(pair).bars[tf] ?? [];
}

export function setTicker(pair: string, t: TickerSnap): void {
  ensure(pair).ticker = t;
}

export function getTicker(pair: string): TickerSnap | null {
  return ensure(pair).ticker;
}

export function setBook(pair: string, b: BookSnap): void {
  ensure(pair).book = b;
}

export function getBook(pair: string): BookSnap | null {
  return ensure(pair).book;
}

export function listStoredPairs(): string[] {
  return [...store.keys()];
}

export function midPrice(pair: string): number | null {
  const t = getTicker(pair);
  if (t && t.mid > 0) return t.mid;
  const bars = getBars(pair, "1");
  const last = bars[bars.length - 1];
  return last && last.close > 0 ? last.close : null;
}

export type PairDataAge = {
  pair: string;
  /** Age of last 5m bar write (ms), or -1 if missing. */
  bar5AgeMs: number;
  /** Age of last 60m bar write (ms), or -1 if missing. */
  bar60AgeMs: number;
  /** Age of ticker/price update (ms), or -1 if missing. */
  priceAgeMs: number;
  /** Candle open-time lag for 5m (now - last bar.time). */
  candle5LagMs: number;
};

export function getBarUpdatedAt(pair: string, tf: Tf): number | null {
  const t = ensure(pair).barUpdatedAt[tf];
  return t != null && t > 0 ? t : null;
}

export function getPairDataAge(pair: string, now = Date.now()): PairDataAge {
  const s = ensure(pair);
  const bar5At = s.barUpdatedAt["5"];
  const bar60At = s.barUpdatedAt["60"];
  const priceAt = s.ticker?.updatedAt;
  const bars5 = s.bars["5"] ?? [];
  const last5 = bars5[bars5.length - 1];
  return {
    pair: norm(pair),
    bar5AgeMs: bar5At != null ? now - bar5At : -1,
    bar60AgeMs: bar60At != null ? now - bar60At : -1,
    priceAgeMs: priceAt != null ? now - priceAt : -1,
    candle5LagMs:
      last5 != null && last5.time > 0 ? now - last5.time * 1000 : -1,
  };
}

export function getMarketDataAges(
  pairs: readonly string[],
  now = Date.now(),
): PairDataAge[] {
  return pairs.map((p) => getPairDataAge(p, now));
}

/** Compact log fragment: dataAge 5m=12s px=3s btc60=40s */
export function formatDataAgeLog(ages: readonly PairDataAge[]): string {
  const fmt = (ms: number) =>
    ms < 0 ? "na" : ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${(ms / 60_000).toFixed(1)}m`;
  const btc = ages.find((a) => a.pair === "XBTEUR" || a.pair.startsWith("XBT"));
  const sample = ages[0];
  const parts = [
    `dataAge`,
    sample ? `5m=${fmt(sample.bar5AgeMs)}` : null,
    sample ? `px=${fmt(sample.priceAgeMs)}` : null,
    btc ? `btc60=${fmt(btc.bar60AgeMs)}` : null,
    btc ? `btcPx=${fmt(btc.priceAgeMs)}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * Stale if 5m bars older than 3 min, or BTC price/60m older than 15 min.
 */
export function isMarketDataStale(
  ages: readonly PairDataAge[],
  opts?: { bar5MaxMs?: number; btcMaxMs?: number },
): { stale: boolean; reason?: string } {
  const bar5Max = opts?.bar5MaxMs ?? 3 * 60_000;
  const btcMax = opts?.btcMaxMs ?? 15 * 60_000;
  for (const a of ages) {
    if (a.bar5AgeMs >= 0 && a.bar5AgeMs > bar5Max) {
      return {
        stale: true,
        reason: `${a.pair} 5m bar age ${(a.bar5AgeMs / 1000).toFixed(0)}s > ${bar5Max / 1000}s`,
      };
    }
    if (a.candle5LagMs >= 0 && a.candle5LagMs > bar5Max + 5 * 60_000) {
      return {
        stale: true,
        reason: `${a.pair} 5m candle lag ${(a.candle5LagMs / 1000).toFixed(0)}s`,
      };
    }
  }
  const btc = ages.find((a) => a.pair === "XBTEUR" || a.pair.startsWith("XBT"));
  if (btc) {
    if (btc.priceAgeMs >= 0 && btc.priceAgeMs > btcMax) {
      return {
        stale: true,
        reason: `BTC price age ${(btc.priceAgeMs / 1000).toFixed(0)}s > ${btcMax / 1000}s`,
      };
    }
    if (btc.bar60AgeMs >= 0 && btc.bar60AgeMs > btcMax) {
      return {
        stale: true,
        reason: `BTC 60m bar age ${(btc.bar60AgeMs / 1000).toFixed(0)}s > ${btcMax / 1000}s`,
      };
    }
  }
  return { stale: false };
}

const PUBLIC = "https://api.kraken.com";

/** REST OHLC seed / fallback — lives here so store writes share this module instance. */
export async function restBackfill(pairAlt: string, interval: number): Promise<void> {
  const url = `${PUBLIC}/0/public/OHLC?pair=${encodeURIComponent(pairAlt)}&interval=${interval}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.warn(`[Kraken/REST] OHLC HTTP ${res.status} ${pairAlt} ${interval}m`);
    return;
  }
  const body = (await res.json()) as {
    error?: string[];
    result?: Record<string, unknown>;
  };
  if (body.error?.length) {
    console.warn(`[Kraken/REST] OHLC ${pairAlt}: ${body.error.join("; ")}`);
    return;
  }
  const series = Object.entries(body.result ?? {}).find(([k]) => k !== "last")?.[1];
  if (!Array.isArray(series)) {
    console.warn(
      `[Kraken/REST] OHLC ${pairAlt} sin series keys=${Object.keys(body.result ?? {}).join(",")}`,
    );
    return;
  }
  const tf = String(interval) as Tf;
  if (!["1", "3", "5", "15", "60", "240"].includes(tf)) return;
  const bars: Bar[] = [];
  for (const row of series) {
    if (!Array.isArray(row) || row.length < 7) continue;
    bars.push({
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[6]),
    });
  }
  if (!bars.length) return;
  setBars(pairAlt, tf, bars);
  const up = pairAlt.toUpperCase();
  if (up === "XXBTZEUR") setBars("XBTEUR", tf, bars);
  if (up === "XBTEUR") setBars("XXBTZEUR", tf, bars);
  if (up === "XETHZEUR") setBars("ETHEUR", tf, bars);
  if (up === "ETHEUR") setBars("XETHZEUR", tf, bars);
}

/** Ingest a public trade into 1m and 3m candles (WS trade channel). */
export function applyTradeTick(
  pair: string,
  price: number,
  qty: number,
  timeSec: number,
): void {
  if (!(price > 0) || !(qty > 0) || !(timeSec > 0)) return;
  for (const mins of [1, 3] as const) {
    const bucket = Math.floor(timeSec / (mins * 60)) * (mins * 60);
    const tf = String(mins) as Tf;
    const list = getBars(pair, tf);
    const last = list[list.length - 1];
    if (last && last.time === bucket) {
      upsertBar(pair, tf, {
        time: bucket,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
        volume: last.volume + qty,
      });
    } else {
      upsertBar(pair, tf, {
        time: bucket,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: qty,
      });
    }
  }
}

/** True when last 1m candle is fresh enough to trade fast strategies (<90s). */
export function isFastCandleFresh(pair: string, maxAgeMs = 90_000, now = Date.now()): boolean {
  const bars = getBars(pair, "1");
  const last = bars[bars.length - 1];
  if (!last) return false;
  const writeAt = getBarUpdatedAt(pair, "1");
  if (writeAt != null && now - writeAt <= maxAgeMs) return true;
  // Fallback: candle open time within 2 minutes
  return now - last.time * 1000 <= maxAgeMs + 60_000;
}
