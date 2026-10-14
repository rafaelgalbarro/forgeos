/**
 * Cross-process Kraken Futures engine state (PM2 ↔ Next.js diagnostics).
 */

import fs from "node:fs";
import path from "node:path";

export const FUTURES_ENGINE_STATE_FILE = path.join(
  process.cwd(),
  ".forgeos",
  "cache",
  "kraken-futures-engine-state.json",
);

export type KrakenFuturesEngineStateFile = {
  pid: number;
  startedAt: string;
  updatedAt: string;
  started: boolean;
  shadowMode: boolean;
  leverageCap: number;
  availableMargin: number;
  balanceValue: number;
  currency: string;
  lastCycleAt: string | null;
  lastMarginFetchAt: string | null;
  ws: { connected: boolean; symbols: string[] };
  lastCycle: {
    symbols: number;
    dataAgeMs: number | null;
    signals: number;
    orders: number;
    shadow: number;
  } | null;
};

export function writeFuturesEngineState(
  partial: Omit<KrakenFuturesEngineStateFile, "pid" | "updatedAt" | "startedAt"> & {
    pid?: number;
    startedAt?: string;
  },
): void {
  try {
    fs.mkdirSync(path.dirname(FUTURES_ENGINE_STATE_FILE), { recursive: true });
    const prev = readFuturesEngineState();
    const payload: KrakenFuturesEngineStateFile = {
      pid: partial.pid ?? process.pid,
      startedAt: partial.startedAt ?? prev?.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      started: partial.started,
      shadowMode: partial.shadowMode,
      leverageCap: partial.leverageCap,
      availableMargin: partial.availableMargin,
      balanceValue: partial.balanceValue,
      currency: partial.currency,
      lastCycleAt: partial.lastCycleAt,
      lastMarginFetchAt: partial.lastMarginFetchAt,
      ws: partial.ws,
      lastCycle: partial.lastCycle,
    };
    fs.writeFileSync(FUTURES_ENGINE_STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[Kraken/Futures/State]",
      err instanceof Error ? err.message : err,
    );
  }
}

export function readFuturesEngineState(): KrakenFuturesEngineStateFile | null {
  try {
    if (!fs.existsSync(FUTURES_ENGINE_STATE_FILE)) return null;
    return JSON.parse(
      fs.readFileSync(FUTURES_ENGINE_STATE_FILE, "utf8"),
    ) as KrakenFuturesEngineStateFile;
  } catch {
    return null;
  }
}

/** Process alive + state file fresh within maxAgeMs. */
export function isFuturesEngineStateLive(maxAgeMs = 5 * 60_000): boolean {
  const s = readFuturesEngineState();
  if (!s?.started) return false;
  const age = Date.now() - Date.parse(s.updatedAt);
  return Number.isFinite(age) && age >= 0 && age < maxAgeMs;
}
