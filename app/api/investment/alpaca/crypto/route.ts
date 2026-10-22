import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALPACA_API_KEY = process.env.ALPACA_API_KEY ?? "";
const ALPACA_SECRET = process.env.ALPACA_SECRET ?? "";

const DEFAULT_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD", "DOGE/USD", "XRP/USD"];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get("symbols");
    const symbols = raw ? raw.split(",").map(s => s.trim()) : DEFAULT_SYMBOLS;

    const syms = symbols.map(s => encodeURIComponent(s)).join(",");

    const res = await fetch(
      `https://data.alpaca.markets/v1beta3/crypto/us/latest/bars?symbols=${syms}`,
      {
        headers: {
          "APCA-API-KEY-ID": ALPACA_API_KEY,
          "APCA-API-SECRET-KEY": ALPACA_SECRET,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Alpaca ${res.status}: ${text}`);
    }

    const data = await res.json();
    const bars = data.bars ?? {};

    const quotes = Object.entries(bars).map(([symbol, bar]: [string, any]) => ({
      symbol,
      price: bar.c,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      volume: bar.v,
      timestamp: bar.t,
    }));

    return NextResponse.json({ ok: true, quotes, count: quotes.length, source: "alpaca-paper" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Alpaca crypto failed";
    return NextResponse.json({ ok: false, error: message, quotes: [] }, { status: 503 });
  }
}
