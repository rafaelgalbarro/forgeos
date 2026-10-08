/**
 * GET /api/trading/stocks/scan — last opportunity scan for dashboard.
 * POST — run a fresh scan (internal key).
 */

import { NextRequest, NextResponse } from "next/server";
import { loadStocksOpportunityScan } from "@/lib/trading/stocks/scan-store";
import {
  runStocksOpportunityScan,
  sendStocksScanDailyDigest,
} from "@/lib/trading/stocks/opportunity-scanner";

function authorize(req: NextRequest): boolean {
  const key = process.env.IBKR_INTERNAL_API_KEY?.trim();
  if (!key) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-internal-api-key") === key;
}

export async function GET() {
  const scan = loadStocksOpportunityScan();
  if (!scan) {
    return NextResponse.json({
      ok: true,
      scan: null,
      message: "No hay escaneo aún",
    });
  }
  return NextResponse.json({
    ok: true,
    scan: {
      at: scan.at,
      window: scan.window,
      cashUsd: scan.cashUsd,
      cashEur: scan.cashEur,
      screened: scan.screened,
      prefiltered: scan.prefiltered,
      analyzed: scan.analyzed,
      selected: scan.selected,
      top10: scan.top10,
      // Full detail for dashboard drill-down
      allAnalyzed: scan.allAnalyzed,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    digest?: boolean;
    notifyTelegram?: boolean;
  };
  if (body.digest) {
    await sendStocksScanDailyDigest();
    return NextResponse.json({ ok: true, digest: true });
  }
  const scan = await runStocksOpportunityScan({
    notifyTelegram: body.notifyTelegram !== false,
  });
  return NextResponse.json({
    ok: true,
    at: scan.at,
    screened: scan.screened,
    prefiltered: scan.prefiltered,
    analyzed: scan.analyzed,
    selectedCount: scan.selected.length,
    top: scan.top10.slice(0, 5).map((o) => ({
      symbol: o.symbol,
      score: o.score,
      riskReward: o.riskReward,
      passed: o.passedSelection,
    })),
  });
}
