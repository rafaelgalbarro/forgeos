/**
 * Alpaca crypto history — 4H bars for indicators, 1H for change1h, change1d vs 24h ago.
 */

import "server-only";

import { isAlpacaConfigured } from "@/lib/brokers/alpaca-client";
import {
  isAlpacaCryptoTicker,
  normalizeAlpacaTicker,
  toAlpacaCryptoSymbol,
} from "@/lib/brokers/alpaca-pairs";
import { cacheKey, getOrSetCached } from "@/lib/market-data/cache";

export type AlpacaHistoryBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type AlpacaCryptoMetrics = {
  change1dPct: number;
  change1hPct: number;
  bars4h: AlpacaHistoryBar[];
  bars1h: AlpacaHistoryBar[];
};

const BARS_TTL_MS = 3 * 60 * 1000;

function alpacaDataBase(): string {
  return (process.env.ALPACA_DATA_URL ?? "https://data.alpaca.markets").replace(/\/$/, "");
}

function alpacaHeaders(): Record<string, string> {
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY?.trim() ?? "",
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET?.trim() ?? "",
  };
}

async function fetchAlpacaBars(
  slashSymbol: string,
  timeframe: "1Hour" | "4Hour",
  limit: number,
): Promise<AlpacaHistoryBar[]> {
  if (!isAlpacaConfigured()) return [];
  const start = new Date(Date.now() - limit * (timeframe === "4Hour" ? 4 : 1) * 60 * 60_000).toISOString();
  const url =
    `${alpacaDataBase()}/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(slashSymbol)}` +
    `&timeframe=${timeframe}&limit=${limit}&start=${encodeURIComponent(start)}`;

  const res = await fetch(url, {
    headers: alpacaHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    bars?: Record<string, Array<{ t?: string; o?: number; h?: number; l?: number; c?: number; v?: number }>>;
  };
  const rows = json.bars?.[slashSymbol] ?? [];
  return rows
    .map((b) => ({
      time: String(b.t ?? ""),
      open: Number(b.o ?? 0),
      high: Number(b.h ?? 0),
      low: Number(b.l ?? 0),
      close: Number(b.c ?? 0),
      volume: Number(b.v ?? 0),
    }))
    .filter((b) => b.close > 0);
}

function changePctFromBars(bars: AlpacaHistoryBar[], lookbackMs: number): number {
  if (bars.length < 2) return 0;
  const last = bars[bars.length - 1]!;
  const targetTs = Date.parse(last.time) - lookbackMs;
  let ref = bars[0]!;
  for (const bar of bars) {
    const ts = Date.parse(bar.time);
    if (ts <= targetTs) ref = bar;
  }
  if (!(ref.close > 0)) return 0;
  return ((last.close - ref.close) / ref.close) * 100;
}

function change1hFromHourly(bars1h: AlpacaHistoryBar[]): number {
  if (bars1h.length < 2) return 0;
  const last = bars1h[bars1h.length - 1]!;
  const prev = bars1h[bars1h.length - 2]!;
  if (!(prev.close > 0)) return 0;
  return ((last.close - prev.close) / prev.close) * 100;
}

/** 4H history + change1d (24h) + change1h (última hora). */
export async function getAlpacaCryptoMetrics(ticker: string): Promise<AlpacaCryptoMetrics | null> {
  const id = normalizeAlpacaTicker(ticker);
  if (!isAlpacaCryptoTicker(id)) return null;

  const slash = toAlpacaCryptoSymbol(id);
  const cacheId = cacheKey("alpaca-crypto-metrics", id);
  return getOrSetCached(cacheId, BARS_TTL_MS, async () => {
    const [bars4h, bars1h] = await Promise.all([
      fetchAlpacaBars(slash, "4Hour", 120),
      fetchAlpacaBars(slash, "1Hour", 30),
    ]);

    const change1dPct = changePctFromBars(bars1h.length >= 6 ? bars1h : bars4h, 24 * 60 * 60_000);
    const change1hPct = change1hFromHourly(bars1h);

    return {
      change1dPct,
      change1hPct,
      bars4h,
      bars1h,
    };
  });
}

export async function getAlpacaCryptoBars4h(ticker: string, limit = 80): Promise<AlpacaHistoryBar[]> {
  const id = normalizeAlpacaTicker(ticker);
  if (!isAlpacaCryptoTicker(id)) return [];
  const slash = toAlpacaCryptoSymbol(id);
  return fetchAlpacaBars(slash, "4Hour", limit);
}
