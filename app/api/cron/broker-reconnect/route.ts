import { NextResponse } from "next/server";
import { ensureIbkrBrokerConnected } from "@/lib/trading/ibkr-reconnect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron / sidecar hook — status check only (no POST connect/reconnect).
 * Use the dashboard «Reconectar Broker» button to restore the socket.
 */
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
    reconnect: "disabled_use_dashboard_button",
    at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
