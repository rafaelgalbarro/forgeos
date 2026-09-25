import { NextResponse } from "next/server";
import { getMultiAccountSnapshot } from "@/lib/integrations/multi-account";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/accounts — multi-account IBKR read-only list. */
export async function GET() {
  try {
    const snapshot = await getMultiAccountSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "accounts failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        accounts: [],
        note: "NO_DATA",
      },
      { status: 503 },
    );
  }
}
