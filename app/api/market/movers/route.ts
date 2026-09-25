/**
 * GET /api/market/movers — top gainers/losers/active from EODHD screener.
 */

import { NextResponse } from "next/server";
import { screenerUsGainers, isEodhdConfigured } from "@/lib/market-data/eodhd";
import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import { sectorForSymbol } from "@/lib/trading/usa-sectors";
import { getCurrentTradingPhase } from "@/lib/trading/cycle-schedule";

const TTL_MS = 5 * 60_000;

export async function GET() {
  const cacheId = cacheKey("api-market-movers");
  const hit = getCached<Record<string, unknown>>(cacheId);
  if (hit) return NextResponse.json(hit);

  if (!isEodhdConfigured()) {
    return NextResponse.json(
      { error: "EODHD not configured", gainers: [], losers: [], mostActive: [] },
      { status: 503 },
    );
  }

  const [gainersRaw, losersRaw, activeRaw] = await Promise.all([
    screenerUsGainers({ limit: 30, sort: "refund_1d_p-desc" }),
    screenerUsGainers({ limit: 30, sort: "refund_1d_p-asc" }),
    screenerUsGainers({ limit: 20, sort: "avgvol_200d-desc" }),
  ]);

  const mapRow = (r: (typeof gainersRaw)[number]) => ({
    symbol: r.symbol,
    price: r.price,
    change_p: r.changePct,
    volume: r.volume,
    sector: r.sector ?? sectorForSymbol(r.symbol) ?? "Unknown",
  });

  const payload = {
    gainers: gainersRaw.filter((r) => r.changePct > 0).slice(0, 15).map(mapRow),
    losers: losersRaw.filter((r) => r.changePct < 0).slice(0, 15).map(mapRow),
    mostActive: activeRaw.slice(0, 10).map((r) => ({
      symbol: r.symbol,
      price: r.price,
      volume: r.volume,
      avgVol: r.volume,
    })),
    phase: getCurrentTradingPhase(),
    updatedAt: new Date().toISOString(),
  };

  setCached(cacheId, payload, TTL_MS);
  return NextResponse.json(payload);
}
