import { NextResponse } from "next/server";
import {
  ensureDailyUniverse,
  getDailyUniverse,
  refreshDailyMarketUniverse,
} from "@/lib/investment/market-daily-universe";
import { resolveTradingCycleTickers } from "@/lib/investment/cycle-universe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/market-scanner/universe — current FMP daily TOP100 + source. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("refresh") === "1";
    if (force) {
      await refreshDailyMarketUniverse(true);
    } else {
      await ensureDailyUniverse();
    }

    const daily = getDailyUniverse();
    const cycle = resolveTradingCycleTickers(100);

    return NextResponse.json({
      ok: true,
      source: daily?.source ?? cycle.source,
      cycleSource: cycle.source,
      generatedAt: daily?.generatedAt ?? null,
      nextRefreshAt: daily?.nextRefreshAt ?? null,
      screenerCount: daily?.screenerCount ?? 0,
      topCount: daily?.tickers.length ?? 0,
      tickers: (daily?.tickers ?? []).map((t) => ({
        symbol: t.symbol,
        price: t.price,
        changePct: t.changePct,
        score: t.score,
        category: t.category,
        rsi14: t.rsi14,
        volume: t.volume,
        avgVolume: t.avgVolume,
      })),
      cycleTickers: cycle.tickers,
      excludedEarnings: daily?.excludedEarnings ?? [],
      sectorLeader: daily?.sectorLeader ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Universe load failed";
    return NextResponse.json({ ok: false, error: message, tickers: [], cycleTickers: [] }, { status: 500 });
  }
}
