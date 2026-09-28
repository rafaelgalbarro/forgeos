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
import { isKrakenCryptoBroker } from "@/lib/trading/crypto/config";

const ANALYSIS_MS = Math.max(
  15_000,
  Number(process.env.CRYPTO_ANALYSIS_INTERVAL_MS ?? 60_000) || 60_000,
);

const startedAt = new Date().toISOString();

function heartbeat(): void {
  const s = getKrakenEngineStatus();
  writeCryptoEngineHeartbeat({
    role: "standalone",
    startedAt,
    lastCycleAt: s.lastCycleAt,
    exitLoopRunning: s.exitLoopRunning,
    wsConnected: s.ws.connected,
    wsSymbols: s.ws.symbols,
    regime: s.regime.regime,
    analysisIntervalMs: ANALYSIS_MS,
    lastSignals: s.lastSignals,
    openForgeOs: s.openForgeOs,
  });
}

async function analysisTick(): Promise<void> {
  const t0 = Date.now();
  try {
    const result = await runKrakenAnalysisCycle();
    const status = getKrakenEngineStatus();
    console.log(
      `[CryptoEngine] analysis ok=${result.executed.length} shadow=${result.shadow.length} held=${result.held.length} signals=${result.signals.length} regime=${status.regime.regime} ws=${status.ws.connected} ${Date.now() - t0}ms`,
    );
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
  if (!isKrakenConfigured()) {
    console.error(
      "[CryptoEngine] Faltan KRAKEN_API_KEY / KRAKEN_API_SECRET — reintento en 30s",
    );
    await new Promise((r) => setTimeout(r, 30_000));
    // Re-read via child restart is PM2's job; keep process alive briefly then exit for autorestart
    process.exit(1);
  }

  console.log(
    `[CryptoEngine] arranque pid=${process.pid} analysis=${ANALYSIS_MS}ms exits=5s`,
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
