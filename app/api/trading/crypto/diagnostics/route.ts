/**
 * GET /api/trading/crypto/diagnostics — régimen 24h, señales / casi-señales, descartes.
 */

import { NextResponse } from "next/server";
import {
  loadDiagnostics,
  REGIME_STRATEGY_MATRIX,
  topDiscardReasons,
} from "@/lib/trading/crypto/diagnostics";
import { getMarketRegime } from "@/lib/trading/crypto/regime";
import { peekKrakenUniverse } from "@/lib/brokers/kraken/universe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const diag = loadDiagnostics();
  const regime = getMarketRegime();
  const uni = peekKrakenUniverse();
  const totalMin =
    diag.regimeMinutes.ALCISTA +
    diag.regimeMinutes.LATERAL +
    diag.regimeMinutes.BAJISTA;
  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    regime: {
      current: regime.regime,
      raw: regime.rawRegime ?? null,
      pending: regime.pendingRegime ?? null,
      btcDrop1hPct: regime.btcDrop1hPct,
      hoursLast24h: {
        ALCISTA: (diag.regimeMinutes.ALCISTA / 60).toFixed(2),
        LATERAL: (diag.regimeMinutes.LATERAL / 60).toFixed(2),
        BAJISTA: (diag.regimeMinutes.BAJISTA / 60).toFixed(2),
        totalHours: (totalMin / 60).toFixed(2),
      },
      strategyMatrix: REGIME_STRATEGY_MATRIX,
    },
    universe: {
      selected: uni.selected?.map((p) => p.wsname ?? p.altname) ?? diag.universePairs,
      count: uni.selected?.length ?? diag.universePairs.length,
      diagnosticsPairs: diag.universePairs,
    },
    lastCycle: {
      at: diag.lastCycleAt,
      signals: diag.lastCycleSignals,
      tradesLast24h: diag.tradesLast24h,
    },
    strategies: diag.strategies,
    nearMisses: diag.nearMisses.slice(-40).reverse(),
    topDiscardReasons: topDiscardReasons(12),
  });
}
