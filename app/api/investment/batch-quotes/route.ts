import { NextRequest, NextResponse } from "next/server";
import { getBatchPrices } from "@/lib/market-data/yahoo-finance";
import { getDataRefreshPolicy } from "@/lib/market-data/refresh-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QuoteOut = {
  symbol: string;
  price: number | null;
  changePct: number | null;
  volume: number | null;
};

/**
 * Batched Yahoo quotes for Acciones / heatmap — single request, 5m server cache.
 * ANALYSIS_ONLY.
 */
export async function GET(req: NextRequest) {
  const started = Date.now();
  try {
    const raw = req.nextUrl.searchParams.get("symbols") ?? "";
    const symbols = [
      ...new Set(
        raw
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      ),
    ].slice(0, 80);

    if (symbols.length === 0) {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        quotes: {} as Record<string, QuoteOut>,
        durationMs: Date.now() - started,
        policy: getDataRefreshPolicy(),
      });
    }

    const map = await getBatchPrices(symbols);
    const quotes: Record<string, QuoteOut> = {};
    for (const symbol of symbols) {
      const q = map.get(symbol);
      quotes[symbol] = {
        symbol,
        price: q?.price ?? null,
        changePct: q && Number.isFinite(q.changePct) ? q.changePct : null,
        volume: q?.volume ?? null,
      };
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      quotes,
      count: Object.keys(quotes).length,
      durationMs: Date.now() - started,
      cacheTtlMs: getDataRefreshPolicy().priceTtlMs,
      fromCacheHint: Date.now() - started < 100,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Batch quotes failed",
        quotes: {},
        durationMs: Date.now() - started,
      },
      { status: 200 },
    );
  }
}
