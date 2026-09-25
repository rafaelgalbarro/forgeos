import { NextResponse } from "next/server";
import { readForexRuntimeStatus } from "@/lib/investment/forex/server-env";
import { loadForexEnvConfig } from "@/lib/investment/forex/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Runtime FOREX flags — reads process.env on each request (not build time). */
export async function GET() {
  const status = readForexRuntimeStatus();
  const config = loadForexEnvConfig();
  const forexEnabled = status.forexEnabled || config.enabled;
  return NextResponse.json({
    ...status,
    forexEnabled,
    configEnabled: config.enabled,
  });
}
