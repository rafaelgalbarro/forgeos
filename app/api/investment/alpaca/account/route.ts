import { NextResponse } from "next/server";
import { getAccount, isAlpacaConfigured } from "@/lib/brokers/alpaca-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/alpaca/account — Alpaca paper balance & status. */
export async function GET() {
  if (!isAlpacaConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "ALPACA_API_KEY / ALPACA_SECRET not set",
        mode: "ANALYSIS_ONLY",
      },
      { status: 503 },
    );
  }
  try {
    const account = await getAccount();
    return NextResponse.json({
      configured: true,
      mode: "ALPACA_PAPER",
      account,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        error: error instanceof Error ? error.message : "Alpaca account failed",
        mode: "ALPACA_PAPER",
      },
      { status: 502 },
    );
  }
}
