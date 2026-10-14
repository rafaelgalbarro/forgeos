/**
 * Persistent Kraken crypto engine entry (PM2: forgeos-crypto-engine).
 * Owns WebSocket market data, 5s exit loop, and 60s analysis cycle.
 *
 * Boot via: node scripts/crypto-engine.mjs
 * Or:      pm2 start ecosystem.config.js --only forgeos-crypto-engine
 */

import {
  getKrakenEngineStatus,
  runKrakenAnalysisCycle,
  startKrakenEngine,
} from "@/lib/trading/crypto/engine";
import {
  isCryptoEngineStandalone,
  writeCryptoEngineHeartbeat,
} from "@/lib/trading/crypto/engine-heartbeat";
import { isKrakenConfigured } from "@/lib/brokers/kraken";
import { isKrakenCryptoBroker, isCryptoFuturesVenue } from "@/lib/trading/crypto/config";
import { isKrakenFuturesConfigured } from "@/lib/brokers/kraken-futures";
import { getFuturesWsStatus } from "@/lib/brokers/kraken-futures/ws-client";
import { readFuturesEngineState } from "@/lib/trading/crypto/futures-engine-state";
import { runCryptoEngineAlarms } from "@/lib/trading/crypto/alarms";

const ANALYSIS_MS = Math.max(
  15_000,
  Number(process.env.CRYPTO_ANALYSIS_INTERVAL_MS ?? 60_000) || 60_000,
);

const startedAt = new Date().toISOString();

function heartbeat(): void {
  const s = getKrakenEngineStatus();
  const futures = isCryptoFuturesVenue();
  const fState = futures ? readFuturesEngineState() : null;
  const fWs = futures ? getFuturesWsStatus() : null;
  writeCryptoEngineHeartbeat({
    role: "standalone",
    startedAt,
    lastCycleAt: fState?.lastCycleAt ?? s.lastCycleAt,
    exitLoopRunning: futures ? true : s.exitLoopRunning,
    wsConnected: fWs?.connected ?? s.ws.connected,
    wsSymbols: fWs?.symbols.length ?? s.ws.symbols,
    regime: s.regime.regime,
    analysisIntervalMs: ANALYSIS_MS,
    lastSignals: s.lastSignals,
    openForgeOs: s.openForgeOs,
  });
  void runCryptoEngineAlarms().catch(() => undefined);
}

async function analysisTick(): Promise<void> {
  const t0 = Date.now();
  try {
    const result = await runKrakenAnalysisCycle();
    const status = getKrakenEngineStatus();
    if (!isCryptoFuturesVenue()) {
      let dataAge = "";
      try {
        const { formatDataAgeLog, getMarketDataAges } = await import(
          "@/lib/brokers/kraken/market-store"
        );
        dataAge = formatDataAgeLog(getMarketDataAges(["XBTEUR", "ETHEUR"]));
      } catch {
        dataAge = "dataAge=na";
      }
      console.log(
        `[CryptoEngine] analysis ok=${result.executed.length} shadow=${result.shadow.length} held=${result.held.length} signals=${result.signals.length} regime=${status.regime.regime} ws=${status.ws.connected} ${dataAge} ${Date.now() - t0}ms`,
      );
    } else {
      console.log(
        `[CryptoEngine] futures analysis ${Date.now() - t0}ms signals=${result.signals.length} orders=${result.executed.length}`,
      );
    }
  } catch (err) {
    console.error(
      "[CryptoEngine] analysis error:",
      err instanceof Error ? err.message : err,
    );
  } finally {
    heartbeat();
  }
}

async function main(): Promise<void> {
  process.env.CRYPTO_ENGINE_ROLE = "standalone";
  process.env.CRYPTO_BROKER = (process.env.CRYPTO_BROKER ?? "kraken").trim() || "kraken";

  if (!isCryptoEngineStandalone()) {
    console.warn("[CryptoEngine] CRYPTO_ENGINE_ROLE forced to standalone");
    process.env.CRYPTO_ENGINE_ROLE = "standalone";
  }

  if (!isKrakenCryptoBroker()) {
    console.error(
      `[CryptoEngine] CRYPTO_BROKER=${process.env.CRYPTO_BROKER} — se espera kraken`,
    );
    process.exit(1);
  }
  if (isCryptoFuturesVenue()) {
    if (!isKrakenFuturesConfigured()) {
      console.error(
        "[CryptoEngine] CRYPTO_VENUE=futures — faltan KRAKEN_FUTURES_* keys",
      );
      process.exit(1);
    }
  } else if (!isKrakenConfigured()) {
    console.error(
      "[CryptoEngine] Faltan KRAKEN_API_KEY / KRAKEN_API_SECRET — reintento en 30s",
    );
    await new Promise((r) => setTimeout(r, 30_000));
    process.exit(1);
  }

  console.log(
    `[CryptoEngine] arranque pid=${process.pid} venue=${isCryptoFuturesVenue() ? "futures" : "spot"} analysis=${ANALYSIS_MS}ms exits=5s`,
  );
  await startKrakenEngine();
  heartbeat();

  await analysisTick();
  setInterval(() => {
    void analysisTick();
  }, ANALYSIS_MS);

  // Heartbeat even between analyses (WS / exit loop liveness)
  setInterval(() => heartbeat(), 15_000);

  process.on("SIGINT", () => {
    console.log("[CryptoEngine] SIGINT — salida");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    console.log("[CryptoEngine] SIGTERM — salida");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[CryptoEngine] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
