/**
 * GET /api/market/sectors — sector heatmap with real-time EODHD quotes.
 */

import { NextResponse } from "next/server";
import { getBatchQuotes, isEodhdConfigured } from "@/lib/market-data/eodhd";
import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import { USA_SECTORS, type UsaSectorName } from "@/lib/trading/usa-sectors";

const TTL_MS = 3 * 60_000;

type TickerRow = {
  symbol: string;
  price: number;
  change_p: number;
  volume: number;
  marketCap: number | null;
  signal: "BUY" | "HOLD" | "WATCH";
};

function signalFromChange(change_p: number): TickerRow["signal"] {
  if (change_p >= 1.5) return "BUY";
  if (change_p <= -1.5) return "WATCH";
  return "HOLD";
}

export async function GET() {
  const cacheId = cacheKey("api-market-sectors");
  const hit = getCached<{
    sectors: unknown[];
    topGainers: unknown[];
    topLosers: unknown[];
    updatedAt: string;
  }>(cacheId);
  if (hit) return NextResponse.json(hit);

  if (!isEodhdConfigured()) {
    return NextResponse.json(
      { error: "EODHD not configured", sectors: [], topGainers: [], topLosers: [] },
      { status: 503 },
    );
  }

  const allSymbols = [...new Set(Object.values(USA_SECTORS).flat())];
  const quotes = await getBatchQuotes(allSymbols);

  const flat: Array<{ symbol: string; price: number; change_p: number; volume: number }> = [];
  const sectors = (Object.keys(USA_SECTORS) as UsaSectorName[]).map((name) => {
    const tickers: TickerRow[] = [];
    for (const symbol of USA_SECTORS[name]) {
      const q = quotes.get(symbol);
      if (!q) continue;
      const row: TickerRow = {
        symbol,
        price: q.price,
        change_p: q.changePercentage,
        volume: q.volume,
        marketCap: null,
        signal: signalFromChange(q.changePercentage),
      };
      tickers.push(row);
      flat.push({
        symbol,
        price: q.price,
        change_p: q.changePercentage,
        volume: q.volume,
      });
    }
    const sectorChange =
      tickers.length > 0
        ? tickers.reduce((s, t) => s + t.change_p, 0) / tickers.length
        : 0;
    const topMover =
      [...tickers].sort((a, b) => Math.abs(b.change_p) - Math.abs(a.change_p))[0] ?? null;
    const sentiment =
      sectorChange >= 0.5 ? "BULLISH" : sectorChange <= -0.5 ? "BEARISH" : "NEUTRAL";

    return {
      name,
      tickers,
      sectorChange: Number(sectorChange.toFixed(2)),
      topMover: topMover
        ? { symbol: topMover.symbol, change_p: topMover.change_p }
        : null,
      sentiment,
    };
  });

  const sorted = [...flat].sort((a, b) => b.change_p - a.change_p);
  const payload = {
    sectors,
    topGainers: sorted.slice(0, 10).map((r) => ({
      symbol: r.symbol,
      change_p: r.change_p,
      price: r.price,
    })),
    topLosers: sorted
      .slice()
      .reverse()
      .slice(0, 10)
      .map((r) => ({ symbol: r.symbol, change_p: r.change_p, price: r.price })),
    updatedAt: new Date().toISOString(),
  };

  setCached(cacheId, payload, TTL_MS);
  return NextResponse.json(payload);
}
