/**
 * GET /api/trading/crypto/performance — resultados por estrategia (real + shadow).
 */

import { NextResponse } from "next/server";
import { getKrakenEngineStatus } from "@/lib/trading/crypto/engine";
import {
  computeCryptoStrategyPerf,
  cryptoJournalPath,
  readCryptoJournal,
} from "@/lib/trading/crypto/journal-crypto";
import { getKrakenDailyRisk } from "@/lib/trading/crypto/risk-daily";
import { isKrakenCryptoBroker } from "@/lib/trading/crypto/config";
import { loadStrategyStatus } from "@/lib/trading/crypto/strategy-status";
import { parseCryptoLiveStrategiesList } from "@/lib/trading/crypto/live-strategies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = getKrakenEngineStatus();
  const perfs = computeCryptoStrategyPerf();
  const trades = readCryptoJournal(500);
  const risk = getKrakenDailyRisk();
  const strategyStatus = loadStrategyStatus();
  const liveList = [...parseCryptoLiveStrategiesList()];
  return NextResponse.json({
    ok: true,
    broker: isKrakenCryptoBroker() ? "kraken" : "other",
    engine: status,
    dailyRisk: risk,
    strategies: perfs,
    strategyStatus: strategyStatus.strategies,
    cryptoLiveStrategies: liveList,
    journalPath: cryptoJournalPath(),
    recentTrades: trades.slice(-50).reverse(),
    at: new Date().toISOString(),
  });
}
