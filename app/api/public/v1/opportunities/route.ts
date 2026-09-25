import { NextRequest, NextResponse } from "next/server";
import { assertPublicApiKey } from "@/lib/integrations/public-api-auth";
import { getOpportunityCenterSnapshot } from "@/lib/investment/opportunity-center-snapshot";
import { getMultiScannerSnapshot } from "@/lib/market-data/market-scanner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/public/v1/opportunities
 * Requires FORGEOS_PUBLIC_API_KEY (Bearer or X-ForgeOS-API-Key).
 * Read-only ANALYSIS_ONLY — never places orders.
 */
export async function GET(req: NextRequest) {
  const denied = assertPublicApiKey(req);
  if (denied) return denied;

  try {
    const [center, multi] = await Promise.all([
      getOpportunityCenterSnapshot(),
      Promise.resolve(getMultiScannerSnapshot()),
    ]);

    const opportunities = [
      ...(center.opportunities ?? []).map((o) => ({
        ticker: o.activo,
        score: o.score ?? null,
        grade: o.grade ?? null,
        source: "opportunity-center" as const,
      })),
      ...(multi?.opportunities ?? []).map((o) => ({
        ticker: o.ticker,
        score: o.score ?? null,
        grade: null as string | null,
        source: "multi-scanner" as const,
      })),
    ];

    // Dedupe by ticker preferring higher score
    const byTicker = new Map<string, (typeof opportunities)[number]>();
    for (const row of opportunities) {
      const key = String(row.ticker ?? "").toUpperCase();
      if (!key) continue;
      const prev = byTicker.get(key);
      if (!prev || (Number(row.score ?? 0) > Number(prev.score ?? 0))) {
        byTicker.set(key, { ...row, ticker: key });
      }
    }

    const list = [...byTicker.values()].sort(
      (a, b) => Number(b.score ?? 0) - Number(a.score ?? 0),
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      count: list.length,
      opportunities: list,
      scannedAt: center.scannedAt ?? multi?.scannedAt ?? null,
      note: "Public read of opportunity center / scanner-store — analysis only",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "opportunities failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        count: 0,
        opportunities: [],
      },
      { status: 503 },
    );
  }
}
