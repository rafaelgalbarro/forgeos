import { NextResponse } from "next/server";
import { getBatchPrices } from "@/lib/market-data/yahoo-finance";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { getUsMarketSession } from "@/src/core/trading/market-session";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";

/** Base currency of the IBKR accounts (NAV is reported in it, not necessarily USD). */
async function accountBaseCurrency(): Promise<string> {
  const acct = await ibkrServiceFetch<Record<string, Record<string, { currency?: string }>>>(
    "/api/ibkr/account",
  ).catch(() => null);
  for (const tags of Object.values(acct ?? {})) {
    const c = String(tags?.NetLiquidation?.currency ?? "").toUpperCase();
    if (c === "EUR" || c === "USD") return c;
  }
  return "USD";
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QuoteOut = {
  symbol: string;
  price: number | null;
  changePct: number | null;
};

function mapQuote(
  map: Map<string, { price: number; changePct: number }>,
  key: string,
  label: string,
): QuoteOut {
  const q = map.get(key);
  if (!q || !Number.isFinite(q.price)) {
    return { symbol: label, price: null, changePct: null };
  }
  return {
    symbol: label,
    price: q.price,
    changePct: Number.isFinite(q.changePct) ? q.changePct : null,
  };
}

/**
 * Compact terminal header feed — SPY / QQQ / VIX + NAV / daily P&L.
 * ANALYSIS_ONLY — no orders.
 */
export async function GET() {
  try {
    const [quotes, acct, currency] = await Promise.all([
      getBatchPrices(["SPY", "QQQ", "^VIX"]).catch(() => new Map()),
      fetchTradingAccountSnapshot().catch(() => null),
      accountBaseCurrency(),
    ]);

    const nav = acct && Number.isFinite(acct.navUSD) ? acct.navUSD : null;
    const dailyPnl = acct && Number.isFinite(acct.dailyPnlUSD) ? acct.dailyPnlUSD : null;
    let dailyPnlPct: number | null = null;
    if (nav != null && dailyPnl != null && nav - dailyPnl !== 0) {
      dailyPnlPct = (dailyPnl / (nav - dailyPnl)) * 100;
    }

    const session = getUsMarketSession();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      spy: mapQuote(quotes, "SPY", "SPY"),
      qqq: mapQuote(quotes, "QQQ", "QQQ"),
      vix: mapQuote(quotes, "^VIX", "VIX"),
      nav,
      dailyPnl,
      dailyPnlPct,
      currency,
      session: {
        phase: session.phase,
        label: session.sessionLabel,
        localTime: session.localTime,
        isTradeable: session.isTradeable,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Header quotes failed",
        generatedAt: new Date().toISOString(),
        mode: "ANALYSIS_ONLY",
        spy: { symbol: "SPY", price: null, changePct: null },
        qqq: { symbol: "QQQ", price: null, changePct: null },
        vix: { symbol: "VIX", price: null, changePct: null },
        nav: null,
        dailyPnl: null,
        dailyPnlPct: null,
        session: null,
      },
      { status: 200 },
    );
  }
}
