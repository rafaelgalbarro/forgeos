/**
 * Shared EODHD US WebSocket state — one writer (PM2), many Next.js readers.
 */

import fs from "node:fs";
import path from "node:path";
import type { EodhdWsQuote } from "@/lib/market-data/eodhd-ws-store";

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");

export const EODHD_WS_STORE_FILE = path.join(CACHE_DIR, "eodhd-us-ws-store.json");
export const EODHD_WS_SUBSCRIBE_FILE = path.join(
  CACHE_DIR,
  "eodhd-us-ws-subscribe-request.json",
);
export const EODHD_WS_HEARTBEAT_FILE = path.join(
  CACHE_DIR,
  "eodhd-us-ws-heartbeat.json",
);

/** Hard subscribe cap (EODHD account limit 50 — leave margin). */
export const EODHD_WS_SUBSCRIBE_CAP = 45;

export type EodhdWsSharedStore = {
  updatedAt: string;
  subscribed: string[];
  quotes: Record<string, EodhdWsQuote>;
  meta: {
    lastMsgAtMs: number;
    freshSymbolsLastMinute: number;
    quoteConnected: boolean;
    tradeConnected: boolean;
  };
};

export type EodhdWsSubscribeRequest = {
  updatedAt: string;
  tickers: string[];
  source?: string;
};

export type EodhdWsHeartbeat = {
  pid: number;
  role: "standalone";
  startedAt: string;
  updatedAt: string;
  subscribed: number;
  quoteConnected: boolean;
  tradeConnected: boolean;
  freshSymbolsLastMinute: number;
  lastMsgAtMs: number;
};

export function isEodhdWsExternal(): boolean {
  const v = (process.env.EODHD_WS_EXTERNAL ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isEodhdWsStandalone(): boolean {
  return (process.env.EODHD_WS_ROLE ?? "").trim().toLowerCase() === "standalone";
}

/** Always false — only PM2 forgeos-eodhd-us-ws may open the socket. */
export function shouldNextJsOwnEodhdWs(): boolean {
  return false;
}

export function readEodhdWsSharedStore(): EodhdWsSharedStore | null {
  try {
    if (!fs.existsSync(EODHD_WS_STORE_FILE)) return null;
    return JSON.parse(fs.readFileSync(EODHD_WS_STORE_FILE, "utf8")) as EodhdWsSharedStore;
  } catch {
    return null;
  }
}

export function writeEodhdWsSharedStore(payload: EodhdWsSharedStore): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(EODHD_WS_STORE_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[EODHD/WS/Store] write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function writeEodhdWsSubscribeRequest(tickers: readonly string[]): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const body: EodhdWsSubscribeRequest = {
      updatedAt: new Date().toISOString(),
      tickers: [...tickers],
      source: "stocks-cycle",
    };
    fs.writeFileSync(EODHD_WS_SUBSCRIBE_FILE, JSON.stringify(body, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[EODHD/WS] subscribe request write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function readEodhdWsSubscribeRequest(): EodhdWsSubscribeRequest | null {
  try {
    if (!fs.existsSync(EODHD_WS_SUBSCRIBE_FILE)) return null;
    return JSON.parse(
      fs.readFileSync(EODHD_WS_SUBSCRIBE_FILE, "utf8"),
    ) as EodhdWsSubscribeRequest;
  } catch {
    return null;
  }
}

export function writeEodhdWsHeartbeat(
  partial: Omit<EodhdWsHeartbeat, "pid" | "updatedAt"> & { pid?: number },
): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const payload: EodhdWsHeartbeat = {
      ...partial,
      pid: partial.pid ?? process.pid,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(EODHD_WS_HEARTBEAT_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[EODHD/WS/Heartbeat] write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function readEodhdWsHeartbeat(): EodhdWsHeartbeat | null {
  try {
    if (!fs.existsSync(EODHD_WS_HEARTBEAT_FILE)) return null;
    return JSON.parse(fs.readFileSync(EODHD_WS_HEARTBEAT_FILE, "utf8")) as EodhdWsHeartbeat;
  } catch {
    return null;
  }
}
