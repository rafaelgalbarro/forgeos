import { NextRequest, NextResponse } from "next/server";
import { getForexHistory, getForexHistoryBatch } from "@/lib/investment/forex/market-data";
import { FOREX_PAIR_IDS } from "@/lib/investment/forex/config";
import { FOREX_TIMEFRAMES } from "@/lib/investment/forex/timeframes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * FOREX OHLCV — ?pair=EURUSD&tf=5m  |  ?all=1&tf=5m
 * Timeframes: 1m, 5m, 15m, 1h, 4h, 1d (IBKR IDEALPRO, Yahoo FX fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const tf = req.nextUrl.searchParams.get("tf") ?? req.nextUrl.searchParams.get("timeframe");
    const all = req.nextUrl.searchParams.get("all") === "1";
    const pair = req.nextUrl.searchParams.get("pair") ?? "EURUSD";

    if (all) {
      const histories = await getForexHistoryBatch(FOREX_PAIR_IDS, tf);
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        timeframe: histories[0]?.timeframe ?? tf ?? "5m",
        timeframes: FOREX_TIMEFRAMES,
        histories,
        mode: "ANALYSIS_ONLY",
      });
    }

    const history = await getForexHistory(pair, tf);
    return NextResponse.json({
      ...history,
      timeframes: FOREX_TIMEFRAMES,
      mode: "ANALYSIS_ONLY",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "FOREX history failed",
        bars: [],
        count: 0,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
