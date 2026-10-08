/**
 * Persistent IBKR non-tradable tickers (INACTIVE / reject codes / ManualBlock).
 * File: .forgeos/cache/ibkr-non-tradable.json
 * Entries expire after 24h unless ibkrStatus=ManualBlock.
 *
 * CRITICAL: every order path must call assertIbkrTradable / isIbkrNonTradable
 * which ALWAYS re-reads the file from disk (no memory cache on reads).
 * Bug 08/10: DTE blocked 14:39 UTC then re-sent 14:48 because memory cache
 * in another worker never saw the write.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "ibkr-non-tradable.json");
const TTL_MS = 24 * 60 * 60 * 1000;

/** IBKR codes that mean the symbol cannot be traded on this account. */
export const IBKR_NON_TRADABLE_CODES = new Set([
  201, 202, 203, 460, 10147, 10148,
]);

export type IbkrNonTradableEntry = {
  symbol: string;
  code: number | null;
  message: string;
  ibkrStatus: string;
  addedAt: string;
  telegramSent: boolean;
  /** ISO expiry; null/undefined = ManualBlock (never auto-expire). */
  expiresAt?: string | null;
};

type CacheShape = {
  updatedAt: string;
  entries: Record<string, IbkrNonTradableEntry>;
};

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

function isManualBlock(entry: IbkrNonTradableEntry): boolean {
  return /^ManualBlock$/i.test(entry.ibkrStatus);
}

function seedManualBlocks(cache: CacheShape): boolean {
  // Keep DTE/TEF blocked until EU contract path is proven in production
  const seeds: Array<{ symbol: string; message: string }> = [
    {
      symbol: "DTE",
      message: "ManualBlock hasta verificar contrato Xetra EUR (no DTE Energy)",
    },
    {
      symbol: "TEF",
      message: "ManualBlock hasta verificar contrato BME EUR (no ADR NYSE)",
    },
  ];
  let changed = false;
  for (const s of seeds) {
    const cur = cache.entries[s.symbol];
    if (cur && isManualBlock(cur)) continue;
    cache.entries[s.symbol] = {
      symbol: s.symbol,
      code: null,
      message: s.message,
      ibkrStatus: "ManualBlock",
      addedAt: new Date().toISOString(),
      telegramSent: true,
      expiresAt: null,
    };
    changed = true;
  }
  return changed;
}

/** Always fresh from disk + seed ManualBlocks if missing. */
function loadFresh(): CacheShape {
  const cache = readDisk();
  if (seedManualBlocks(cache)) {
    cache.updatedAt = new Date().toISOString();
    writeDisk(cache);
  }
  return cache;
}

function entryActive(entry: IbkrNonTradableEntry, now = Date.now()): boolean {
  if (isManualBlock(entry)) return true;
  const exp = entry.expiresAt
    ? Date.parse(entry.expiresAt)
    : Date.parse(entry.addedAt) + TTL_MS;
  if (Number.isFinite(exp) && now >= exp) return false;
  return true;
}

/** Drop expired entries (not ManualBlock); Telegram once per expiry. */
export async function pruneExpiredIbkrNonTradable(): Promise<string[]> {
  const cache = loadFresh();
  const now = Date.now();
  const expired: string[] = [];
  for (const [sym, entry] of Object.entries(cache.entries)) {
    if (isManualBlock(entry)) continue;
    const exp = entry.expiresAt
      ? Date.parse(entry.expiresAt)
      : Date.parse(entry.addedAt) + TTL_MS;
    if (!Number.isFinite(exp) || now < exp) continue;
    expired.push(sym);
    delete cache.entries[sym];
  }
  if (expired.length === 0) return [];
  cache.updatedAt = new Date().toISOString();
  writeDisk(cache);
  for (const sym of expired) {
    await sendTelegramMessage(
      `♻️ <b>Desbloqueo</b> ${sym}: caducó la lista non-tradable (24h)`,
    ).catch(() => undefined);
  }
  return expired;
}

/**
 * Fresh disk read every call — safe across Next.js workers / PM2 processes.
 */
export function isIbkrNonTradable(symbol: string): boolean {
  const t = symbol.trim().toUpperCase();
  if (!t) return false;
  const entry = loadFresh().entries[t];
  if (!entry) return false;
  return entryActive(entry);
}

export function getIbkrNonTradableEntry(
  symbol: string,
): IbkrNonTradableEntry | null {
  const t = symbol.trim().toUpperCase();
  if (!t) return null;
  const entry = loadFresh().entries[t];
  if (!entry || !entryActive(entry)) return null;
  return entry;
}

/**
 * Mandatory pre-flight before ANY IBKR order (cycle, Europe, ExitManager, retries).
 * Always re-reads ibkr-non-tradable.json from disk.
 */
export function assertIbkrTradable(symbol: string): void {
  const t = symbol.trim().toUpperCase();
  const entry = getIbkrNonTradableEntry(t);
  if (!entry) return;
  throw new Error(
    `${t}: bloqueado en ibkr-non-tradable.json ` +
      `(${entry.ibkrStatus}${entry.code != null ? ` code=${entry.code}` : ""}) — ${entry.message}`,
  );
}

export function listIbkrNonTradable(): IbkrNonTradableEntry[] {
  const now = Date.now();
  return Object.values(loadFresh().entries).filter((e) => entryActive(e, now));
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
  if (/^ManualBlock$/i.test(status)) return true;
  const msg = String(params.message ?? "");
  if (/\bINACTIVE\b/i.test(msg)) return true;
  if (/\b(201|202|203|460|10147|10148)\b/.test(msg)) return true;
  return false;
}

export async function recordManualBlock(params: {
  symbol: string;
  message: string;
}): Promise<void> {
  const symbol = params.symbol.trim().toUpperCase();
  if (!symbol) return;
  const cache = loadFresh();
  cache.entries[symbol] = {
    symbol,
    code: null,
    message: params.message,
    ibkrStatus: "ManualBlock",
    addedAt: new Date().toISOString(),
    telegramSent: true,
    expiresAt: null,
  };
  cache.updatedAt = new Date().toISOString();
  writeDisk(cache);
  console.warn(`[IbkrNonTradable] ManualBlock ${symbol}: ${params.message}`);
}

/**
 * Persist ticker as non-tradable. Telegram once per symbol.
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

  const cache = loadFresh();
  const existing = cache.entries[symbol];
  if (existing && isManualBlock(existing)) return false;
  if (existing && entryActive(existing)) return false;

  const code =
    params.code != null && Number.isFinite(Number(params.code))
      ? Number(params.code)
      : null;
  const message =
    (params.message ?? "").replace(/^ORDER_REJECTED:\s*/i, "").trim() ||
    "IBKR non-tradable";
  const ibkrStatus = String(params.ibkrStatus ?? "Inactive").trim() || "Inactive";
  const manual = /^ManualBlock$/i.test(ibkrStatus);
  const addedAt = new Date().toISOString();

  const entry: IbkrNonTradableEntry = {
    symbol,
    code,
    message,
    ibkrStatus,
    addedAt,
    telegramSent: false,
    expiresAt: manual ? null : new Date(Date.now() + TTL_MS).toISOString(),
  };

  cache.entries[symbol] = entry;
  cache.updatedAt = addedAt;
  writeDisk(cache);

  console.warn(
    `[IbkrNonTradable] ${symbol} añadido (${ibkrStatus} code=${code ?? "—"}) @ ${entry.addedAt}: ${message}`,
  );

  const statusLabel = /inactive/i.test(ibkrStatus)
    ? "INACTIVE"
    : code != null
      ? String(code)
      : ibkrStatus;
  const detail =
    /inactive/i.test(ibkrStatus) || code === 201 || code === 10147
      ? "probable PRIIPs/permisos"
      : message.slice(0, 80);
  const line = `⛔ NO NEGOCIABLE ${symbol}: ${statusLabel} (${detail})`;

  try {
    await sendTelegramMessage(line);
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
