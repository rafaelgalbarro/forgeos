/**
 * GET /api/trading/crypto/performance — Kraken engine metrics for dashboard.
 */

import { NextResponse } from "next/server";
import { getKrakenEngineStatus } from "@/lib/trading/crypto/engine";
import {
  computeCryptoStrategyPerf,
  readCryptoJournal,
} from "@/lib/trading/crypto/journal-crypto";
import { getKrakenDailyRisk } from "@/lib/trading/crypto/risk-daily";
import { isKrakenCryptoBroker } from "@/lib/trading/crypto/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = getKrakenEngineStatus();
  const perfs = computeCryptoStrategyPerf();
  const trades = readCryptoJournal(500);
  const risk = getKrakenDailyRisk();
  return NextResponse.json({
    ok: true,
    broker: isKrakenCryptoBroker() ? "kraken" : "other",
    engine: status,
    dailyRisk: risk,
    strategies: perfs,
    recentTrades: trades.slice(-50).reverse(),
    at: new Date().toISOString(),
  });
}
