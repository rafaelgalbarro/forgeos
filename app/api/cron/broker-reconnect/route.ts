import { NextResponse } from "next/server";
import { ensureIbkrBrokerConnected } from "@/lib/trading/ibkr-reconnect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cron / sidecar hook — reconnect IBKR when TWS is up but socket dropped. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization")?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const connected = await ensureIbkrBrokerConnected();
  return NextResponse.json({
    ok: connected,
    connected,
    at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
