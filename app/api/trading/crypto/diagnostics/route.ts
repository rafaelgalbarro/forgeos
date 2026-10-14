/**
 * GET /api/trading/crypto/diagnostics — régimen 24h, señales / casi-señales, descartes.
 * Regime `current` matches engine log / heartbeat (not Next.js empty in-memory state).
 */

import { NextResponse } from "next/server";
import {
  loadDiagnostics,
  REGIME_STRATEGY_MATRIX,
  topDiscardReasons,
} from "@/lib/trading/crypto/diagnostics";
import { getMarketRegime } from "@/lib/trading/crypto/regime";
import {
  isCryptoEngineExternal,
  readCryptoEngineHeartbeat,
} from "@/lib/trading/crypto/engine-heartbeat";
import { peekKrakenUniverse } from "@/lib/brokers/kraken/universe";
import type { MarketRegime } from "@/lib/trading/crypto/regime";
import {
  futuresMaxLeverage,
  futuresShadowMode,
  getCryptoVenue,
  parseFuturesLiveStrategiesList,
} from "@/lib/trading/crypto/futures-config";
import { getKrakenFuturesEngineStatus } from "@/lib/trading/crypto/futures-engine";
import { getFuturesDailyRisk } from "@/lib/trading/crypto/futures-daily-risk";
import { isKrakenFuturesConfigured } from "@/lib/brokers/kraken-futures";
import { checkFuturesEngineCycleAlarm } from "@/lib/trading/crypto/alarms";
import { FUTURES_ENGINE_STATE_FILE } from "@/lib/trading/crypto/futures-engine-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveCurrentRegime(): {
  current: MarketRegime | string;
  source: "memory" | "heartbeat" | "diagnostics";
  raw: MarketRegime | null;
  pending: MarketRegime | null;
  btcDrop1hPct: number;
  btcRet4hPct: number | null;
  btcRet24hPct: number | null;
  updatedAt: string | null;
} {
  const local = getMarketRegime();
  const diag = loadDiagnostics();
  const hb = readCryptoEngineHeartbeat();
  const hbAge = hb ? Date.now() - Date.parse(hb.updatedAt) : Infinity;
  const hbFresh = Number.isFinite(hbAge) && hbAge < 5 * 60_000;

  // Prefer standalone engine heartbeat when Next.js does not own regime updates
  if (isCryptoEngineExternal() && hbFresh && hb?.regime) {
    return {
      current: hb.regime,
      source: "heartbeat",
      raw: (diag.regimeLast as MarketRegime | null) ?? local.rawRegime ?? null,
      pending: local.pendingRegime ?? null,
      btcDrop1hPct: local.btcDrop1hPct,
      btcRet4hPct: local.btcRet4hPct ?? null,
      btcRet24hPct: local.btcRet24hPct ?? null,
      updatedAt: hb.updatedAt,
    };
  }

  // Local memory if this process runs the regime scheduler
  if (local.updatedAt && local.regime) {
    const age = Date.now() - Date.parse(local.updatedAt);
    if (Number.isFinite(age) && age < 30 * 60_000) {
      return {
        current: local.regime,
        source: "memory",
        raw: local.rawRegime ?? null,
        pending: local.pendingRegime ?? null,
        btcDrop1hPct: local.btcDrop1hPct,
        btcRet4hPct: local.btcRet4hPct ?? null,
        btcRet24hPct: local.btcRet24hPct ?? null,
        updatedAt: local.updatedAt,
      };
    }
  }

  // Persisted diagnostics (same value written by recordRegimeTick / [Kraken/Regime] log)
  return {
    current: diag.regimeLast ?? local.regime,
    source: "diagnostics",
    raw: local.rawRegime ?? null,
    pending: local.pendingRegime ?? null,
    btcDrop1hPct: local.btcDrop1hPct,
    btcRet4hPct: local.btcRet4hPct ?? null,
    btcRet24hPct: local.btcRet24hPct ?? null,
    updatedAt: diag.regimeLastAt,
  };
}

export async function GET() {
  await checkFuturesEngineCycleAlarm().catch(() => undefined);
  const diag = loadDiagnostics();
  const regime = resolveCurrentRegime();
  const uni = peekKrakenUniverse();
  const totalMin =
    diag.regimeMinutes.ALCISTA +
    diag.regimeMinutes.LATERAL +
    diag.regimeMinutes.BAJISTA;
  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    regime: {
      current: regime.current,
      source: regime.source,
      raw: regime.raw,
      pending: regime.pending,
      btcDrop1hPct: regime.btcDrop1hPct,
      btcRet4hPct: regime.btcRet4hPct,
      btcRet24hPct: regime.btcRet24hPct,
      updatedAt: regime.updatedAt,
      /** Same as Telegram diag / rolling minutes from recordRegimeTick */
      lastRecorded: diag.regimeLast,
      lastRecordedAt: diag.regimeLastAt,
      hoursLast24h: {
        ALCISTA: (diag.regimeMinutes.ALCISTA / 60).toFixed(2),
        LATERAL: (diag.regimeMinutes.LATERAL / 60).toFixed(2),
        BAJISTA: (diag.regimeMinutes.BAJISTA / 60).toFixed(2),
        totalHours: (totalMin / 60).toFixed(2),
      },
      strategyMatrix: REGIME_STRATEGY_MATRIX,
    },
    universe: {
      selected: uni?.selected?.map((p) => p.wsname ?? p.altname) ?? diag.universePairs,
      count: uni?.selected?.length ?? diag.universePairs.length,
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
    futures: {
      venue: getCryptoVenue(),
      configured: isKrakenFuturesConfigured(),
      shadowMode: futuresShadowMode(),
      leverageCap: futuresMaxLeverage(),
      liveStrategies: [...parseFuturesLiveStrategiesList()],
      engine: getKrakenFuturesEngineStatus(),
      stateFile: FUTURES_ENGINE_STATE_FILE,
      dailyRisk: getFuturesDailyRisk(),
      ws: getKrakenFuturesEngineStatus().ws,
    },
  });
}
