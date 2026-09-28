/**
 * Shared heartbeat so Next.js can observe the PM2 crypto engine process.
 */

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(
  process.cwd(),
  ".forgeos",
  "cache",
  "crypto-engine-heartbeat.json",
);

export type CryptoEngineHeartbeat = {
  pid: number;
  role: "standalone" | "next";
  startedAt: string;
  updatedAt: string;
  lastCycleAt: string | null;
  exitLoopRunning: boolean;
  wsConnected: boolean;
  wsSymbols: number;
  regime: string;
  analysisIntervalMs: number;
  lastSignals: Array<{
    pair: string;
    strategy: string;
    confidence: number;
    score: number;
    shadow: boolean;
    action: string;
  }>;
  openForgeOs: string[];
};

export function writeCryptoEngineHeartbeat(
  partial: Omit<CryptoEngineHeartbeat, "pid" | "updatedAt"> & {
    pid?: number;
  },
): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const payload: CryptoEngineHeartbeat = {
      ...partial,
      pid: partial.pid ?? process.pid,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[CryptoEngine/Heartbeat]",
      err instanceof Error ? err.message : err,
    );
  }
}

export function readCryptoEngineHeartbeat(): CryptoEngineHeartbeat | null {
  try {
    if (!fs.existsSync(FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as CryptoEngineHeartbeat;
    const age = Date.now() - Date.parse(raw.updatedAt);
    if (!Number.isFinite(age) || age > 5 * 60_000) {
      return { ...raw, /* stale marker via updatedAt */ };
    }
    return raw;
  } catch {
    return null;
  }
}

/** True when Next.js must not own WS/exit/analysis loops (PM2 process does). */
export function isCryptoEngineExternal(): boolean {
  const v = (process.env.CRYPTO_ENGINE_EXTERNAL ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isCryptoEngineStandalone(): boolean {
  return (process.env.CRYPTO_ENGINE_ROLE ?? "").trim().toLowerCase() === "standalone";
}
