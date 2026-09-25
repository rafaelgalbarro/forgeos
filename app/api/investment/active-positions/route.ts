import { NextResponse } from "next/server";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getBatchQuotes } from "@/lib/market-data/fmp";
import { loadTradingState } from "@/src/core/trading/trading-state-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BrokerPos = {
  symbol?: string;
  position?: number;
  avgCost?: number;
  account?: string;
};

export async function GET() {
  try {
    const raw = await ibkrServiceFetch<BrokerPos[]>("/api/ibkr/positions");
    const positions = (raw ?? []).filter((p) => Math.abs(Number(p.position ?? 0)) > 0);
    const symbols = [...new Set(positions.map((p) => String(p.symbol ?? "").trim().toUpperCase()).filter(Boolean))];
    const quotes = await getBatchQuotes(symbols);
    const monitored = loadTradingState().monitoredPositions;
    const monitoredMap = new Map(monitored.map((m) => [m.ticker.toUpperCase(), m]));

    const rows = positions.map((p) => {
      const symbol = String(p.symbol ?? "").trim().toUpperCase();
      const qty = Math.abs(Number(p.position ?? 0));
      const entry = Number(p.avgCost ?? 0);
      const q = quotes.get(symbol);
      const current = q?.price ?? 0;
      const pnl = qty > 0 && entry > 0 && current > 0 ? (current - entry) * qty : 0;
      const pnlPct = entry > 0 && current > 0 ? ((current - entry) / entry) * 100 : 0;
      const mon = monitoredMap.get(symbol);
      return {
        symbol,
        account: p.account ?? null,
        qty,
        entryPrice: entry || null,
        currentPrice: current || null,
        unrealizedPnl: Number.isFinite(pnl) ? pnl : 0,
        unrealizedPnlPct: Number.isFinite(pnlPct) ? pnlPct : 0,
        stopLoss: mon?.stopLoss ?? null,
        takeProfit: mon?.takeProfit ?? null,
      };
    });

    return NextResponse.json({ ok: true, positions: rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "active positions failed", positions: [] },
      { status: 500 },
    );
  }
}
