import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness: process alive, version, timestamp.
 */
export async function GET() {
  const pkgVersion = process.env.npm_package_version || "0.1.0";
  return NextResponse.json({
    status: "ok",
    alive: true,
    version: pkgVersion,
    timestamp: new Date().toISOString(),
    program: "6085",
  });
}
