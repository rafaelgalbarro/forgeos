/**
 * Persistent IBKR non-tradable tickers (INACTIVE / reject 201 / 10147).
 * File: .forgeos/cache/ibkr-non-tradable.json
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { notifyOrderRejected } from "@/lib/notifications/telegram-bot";

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "ibkr-non-tradable.json");

/** IBKR codes that mean the symbol cannot be traded on this account. */
export const IBKR_NON_TRADABLE_CODES = new Set([201, 10147]);

export type IbkrNonTradableEntry = {
  symbol: string;
  code: number | null;
  message: string;
  ibkrStatus: string;
  addedAt: string;
  telegramSent: boolean;
};

type CacheShape = {
  updatedAt: string;
  entries: Record<string, IbkrNonTradableEntry>;
};

let memory: CacheShape | null = null;

function emptyCache(): CacheShape {
  return { updatedAt: new Date().toISOString(), entries: {} };
}

function readDisk(): CacheShape {
  try {
    if (!fs.existsSync(CACHE_FILE)) return emptyCache();
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheShape;
    if (!raw || typeof raw !== "object" || !raw.entries) return emptyCache();
    return raw;
  } catch {
    return emptyCache();
  }
}

function writeDisk(cache: CacheShape): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[IbkrNonTradable] write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

function load(): CacheShape {
  if (memory) return memory;
  memory = readDisk();
  return memory;
}

export function isIbkrNonTradable(symbol: string): boolean {
  const t = symbol.trim().toUpperCase();
  if (!t) return false;
  return Boolean(load().entries[t]);
}

export function listIbkrNonTradable(): IbkrNonTradableEntry[] {
  return Object.values(load().entries);
}

export function shouldPersistIbkrNonTradable(params: {
  code?: number | null;
  ibkrStatus?: string | null;
  message?: string;
}): boolean {
  const code = params.code != null ? Number(params.code) : null;
  if (code != null && Number.isFinite(code) && IBKR_NON_TRADABLE_CODES.has(code)) {
    return true;
  }
  const status = String(params.ibkrStatus ?? "").trim();
  if (/^inactive$/i.test(status)) return true;
  const msg = String(params.message ?? "");
  if (/\bINACTIVE\b/i.test(msg)) return true;
  if (/\b(201|10147)\b/.test(msg)) return true;
  return false;
}

/**
 * Persist ticker as non-tradable. Telegram once per symbol (first time only).
 * Returns true if newly added.
 */
export async function recordIbkrNonTradable(params: {
  symbol: string;
  code?: number | null;
  message?: string;
  ibkrStatus?: string | null;
}): Promise<boolean> {
  const symbol = params.symbol.trim().toUpperCase();
  if (!symbol) return false;
  if (!shouldPersistIbkrNonTradable(params)) return false;

  const cache = load();
  const existing = cache.entries[symbol];
  if (existing) {
    return false;
  }

  const code =
    params.code != null && Number.isFinite(Number(params.code))
      ? Number(params.code)
      : null;
  const message =
    (params.message ?? "").replace(/^ORDER_REJECTED:\s*/i, "").trim() ||
    "IBKR non-tradable";
  const ibkrStatus = String(params.ibkrStatus ?? "Inactive").trim() || "Inactive";

  const entry: IbkrNonTradableEntry = {
    symbol,
    code,
    message,
    ibkrStatus,
    addedAt: new Date().toISOString(),
    telegramSent: false,
  };

  cache.entries[symbol] = entry;
  cache.updatedAt = entry.addedAt;
  memory = cache;
  writeDisk(cache);

  console.warn(
    `[IbkrNonTradable] ${symbol} añadido a lista persistente ` +
      `(status=${ibkrStatus} code=${code ?? "—"}): ${message}`,
  );

  try {
    await notifyOrderRejected({
      ticker: symbol,
      code,
      message: `${message} (excluido de futuras órdenes)`,
    });
    entry.telegramSent = true;
    cache.entries[symbol] = entry;
    writeDisk(cache);
  } catch (err) {
    console.warn(
      "[IbkrNonTradable] Telegram failed:",
      err instanceof Error ? err.message : err,
    );
  }

  return true;
}
