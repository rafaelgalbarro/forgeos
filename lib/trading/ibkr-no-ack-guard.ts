/**
 * NO_ACK retry policy: check open orders/executions before retry;
 * max 1 retry per ticker per calendar day; then ManualBlock + Telegram.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  assertIbkrTradable,
  recordManualBlock,
} from "@/lib/trading/ibkr-non-tradable";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { assertOrdersAllowedAfterReconnect } from "@/lib/trading/ibkr-reconnect";
import { assertStocksExecutionAllowed } from "@/lib/trading/stocks-execution-gate";

const FILE = path.join(process.cwd(), ".forgeos", "cache", "ibkr-no-ack-retries.json");

type DayMap = Record<string, { date: string; retries: number; lastAt: string }>;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): DayMap {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as DayMap;
  } catch {
    return {};
  }
}

function save(map: DayMap): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(map, null, 2), "utf8");
  } catch (err) {
    console.warn("[NoAck] save failed:", err instanceof Error ? err.message : err);
  }
}

export function noAckRetriesToday(symbol: string): number {
  const map = load();
  const row = map[symbol.trim().toUpperCase()];
  if (!row || row.date !== todayKey()) return 0;
  return row.retries;
}

export function recordNoAckRetry(symbol: string): number {
  const sym = symbol.trim().toUpperCase();
  const map = load();
  const day = todayKey();
  const prev = map[sym];
  const retries = prev && prev.date === day ? prev.retries + 1 : 1;
  map[sym] = { date: day, retries, lastAt: new Date().toISOString() };
  save(map);
  return retries;
}

/** True if an open order or recent execution likely matches this submit. */
export async function findExistingIbkrFillOrOrder(symbol: string): Promise<{
  found: boolean;
  detail: string;
}> {
  const sym = symbol.trim().toUpperCase();
  try {
    const orders = await ibkrServiceFetch<
      Array<{ symbol?: string; orderId?: number; status?: string; action?: string }>
    >("/api/ibkr/orders").catch(() => []);
    const open = (Array.isArray(orders) ? orders : []).filter(
      (o) => String(o.symbol ?? "").toUpperCase() === sym,
    );
    if (open.length > 0) {
      return {
        found: true,
        detail: `open order ${open[0]!.orderId} status=${open[0]!.status}`,
      };
    }
    // Trades / fills endpoint (if broker exposes it)
    const trades = await ibkrServiceFetch<
      Array<{ symbol?: string; side?: string; time?: string }>
    >("/api/ibkr/trades").catch(() => []);
    const recent = (Array.isArray(trades) ? trades : []).filter(
      (e) => String(e.symbol ?? "").toUpperCase() === sym,
    );
    if (recent.length > 0) {
      return { found: true, detail: `trade/fill side=${recent[0]!.side}` };
    }
  } catch (err) {
    console.warn(
      "[NoAck] open orders/trades check failed:",
      err instanceof Error ? err.message : err,
    );
  }
  return { found: false, detail: "none" };
}

/**
 * Gate before any NO_ACK re-submit. Returns 'proceed' | 'abort_existing' | 'blocked'.
 */
export async function gateNoAckRetry(
  symbol: string,
  opts?: { side?: "BUY" | "SELL" },
): Promise<{
  action: "proceed" | "abort_existing" | "blocked";
  reason: string;
}> {
  assertOrdersAllowedAfterReconnect();
  // Fresh disk blocklist + global pause before any re-submit
  assertIbkrTradable(symbol);
  assertStocksExecutionAllowed({ side: opts?.side ?? "BUY" });
  const existing = await findExistingIbkrFillOrOrder(symbol);
  if (existing.found) {
    return {
      action: "abort_existing",
      reason: `NO_ACK pero ya existe en IBKR: ${existing.detail}`,
    };
  }
  const used = noAckRetriesToday(symbol);
  if (used >= 1) {
    await recordManualBlock({
      symbol,
      message: `NO_ACK — ya se reintentó 1× hoy (${todayKey()})`,
    });
    await sendTelegramMessage(
      `⛔ <b>BLOQUEO</b> ${symbol}: NO_ACK sin fill — máximo 1 reintento/día agotado`,
    ).catch(() => undefined);
    return {
      action: "blocked",
      reason: "NO_ACK: máximo 1 reintento/día — ManualBlock",
    };
  }
  recordNoAckRetry(symbol);
  return { action: "proceed", reason: "retry 1/1 allowed" };
}
