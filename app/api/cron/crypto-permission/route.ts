/**
 * GET/POST /api/cron/crypto-permission — daily IBKR crypto whatIf probe.
 */

import { NextResponse } from "next/server";
import {
  runCryptoPermissionProbe,
  startCryptoPermissionProbeScheduler,
} from "@/lib/trading/crypto/permission-probe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  startCryptoPermissionProbeScheduler();
  const auth = request.headers.get("authorization")?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await runCryptoPermissionProbe({ force });
  return NextResponse.json({
    ok: true,
    ...result,
    at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
