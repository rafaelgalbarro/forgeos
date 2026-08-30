import { NextResponse } from "next/server";
import { getPositions, isAlpacaConfigured } from "@/lib/brokers/alpaca-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/alpaca/positions — open Alpaca positions. */
export async function GET() {
  if (!isAlpacaConfigured()) {
    return NextResponse.json(
      { configured: false, positions: [], error: "Alpaca not configured" },
      { status: 503 },
    );
  }
  try {
    const positions = await getPositions();
    return NextResponse.json({
      configured: true,
      positions,
      count: positions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        positions: [],
        error: error instanceof Error ? error.message : "Alpaca positions failed",
      },
      { status: 502 },
    );
  }
}
