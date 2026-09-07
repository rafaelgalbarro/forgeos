import { NextResponse } from "next/server";
import { getIbkrMarketDataCapability } from "@/lib/investment/ibkr-market-data-capability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Documents IBKR market-data NO_DATA gap — does not invent quotes or proxy fake history.
 */
export async function GET() {
  return NextResponse.json(getIbkrMarketDataCapability());
}
