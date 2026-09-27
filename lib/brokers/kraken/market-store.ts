/**
 * In-memory market data store for Kraken (OHLC + ticker + book top).
 */

import "server-only";

export type Tf = "1" | "5" | "15" | "60" | "240";

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
    s = { bars: {}, ticker: null, book: null };
    store.set(k, s);
  }
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
}

export function setBars(pair: string, tf: Tf, bars: Bar[]): void {
  const s = ensure(pair);
  s.bars[tf] = bars.slice(-MAX_BARS);
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
  if (!["1", "5", "15", "60", "240"].includes(tf)) return;
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
