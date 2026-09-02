import { NextRequest, NextResponse } from "next/server";
import {
  addWatchlistTicker,
  queueTickerForCycle,
} from "@/lib/alerts/alert-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TradingViewBody = {
  secret?: string;
  passphrase?: string;
  ticker?: string;
  symbol?: string;
  side?: string;
  action?: string;
  price?: number | string;
  message?: string;
  [key: string]: unknown;
};

function extractSecret(req: NextRequest, body: TradingViewBody): string | undefined {
  const header =
    req.headers.get("x-tradingview-secret")?.trim() ||
    req.headers.get("x-webhook-secret")?.trim();
  if (header) return header;
  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return body.secret?.trim() || body.passphrase?.trim() || undefined;
}

function extractTicker(body: TradingViewBody): string | undefined {
  const raw = String(body.ticker ?? body.symbol ?? "").trim();
  if (!raw) return undefined;
  // TradingView often sends EXCHANGE:SYMBOL
  const parts = raw.split(":");
  const sym = (parts[parts.length - 1] ?? raw).replace(/[^A-Za-z0-9.\-]/g, "");
  return sym ? sym.toUpperCase() : undefined;
}

/**
 * POST /api/webhooks/tradingview
 * Accept TradingView alert JSON, validate TRADINGVIEW_WEBHOOK_SECRET,
 * queue ticker for analysis/watchlist. NEVER auto-places live orders.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.TRADINGVIEW_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "TradingView webhook disabled — set TRADINGVIEW_WEBHOOK_SECRET",
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
      },
      { status: 503 },
    );
  }

  let body: TradingViewBody;
  try {
    body = (await req.json()) as TradingViewBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const provided = extractSecret(req, body);
  if (!provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ticker = extractTicker(body);
  if (!ticker) {
    return NextResponse.json(
      {
        ok: false,
        error: "ticker or symbol required",
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
      },
      { status: 400 },
    );
  }

  const note = [
    "tradingview",
    body.action ?? body.side ?? "",
    body.message ?? "",
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 200);

  addWatchlistTicker(ticker, note || "TradingView alert");
  queueTickerForCycle(ticker);

  // Explicitly refuse order semantics even if alert payload asks for buy/sell.
  return NextResponse.json({
    ok: true,
    queued: ticker,
    watchlist: true,
    cycleQueue: true,
    orderPlaced: false,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    note: "Ticker queued for analysis only — never auto-places live orders",
  });
}
