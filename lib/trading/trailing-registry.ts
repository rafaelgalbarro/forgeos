/**
 * Shared peak / trailing / cooldown / exit-registration registry.
 * Persist: .forgeos/cache/crypto-trailing.json
 *
 * Crypto exits MUST register here (stop/target/trailing/time) — never IBKR PositionMonitor.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { isLegacyOrphanTicker } from "@/lib/trading/forgeos-owned";

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function cacheDir(): string {
  return path.join(forgeosRoot(), ".forgeos", "cache");
}

function cacheFile(): string {
  return path.join(cacheDir(), "crypto-trailing.json");
}

export const EXIT_STOP_LOSS_PCT = 0.03;
export const EXIT_TRAIL_ACTIVATE_PCT = 0.08;
export const EXIT_TRAIL_DROP_PCT = 0.04;
export const EXIT_PARTIAL_PCT = 0.25;
export const EXIT_REBUY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const MAX_CRYPTO_OPEN_POSITIONS = 5;

export type TrailingSymbolState = {
  /** Highest price seen since trailing activated (or entry while armed). */
  peak: number;
  /** True once unrealized ≥ +8% — trailing is live. */
  trailingActive: boolean;
  /** True after one-time 50% sell at ≥ +25%. */
  partialSold: boolean;
  /** ISO timestamp of last full close — enforces 6h rebuy cooldown. */
  cooldownUntil?: string;
  updatedAt: string;
  /** Exit-manager registration (required for live crypto). */
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  qty?: number;
  openedAt?: string;
  strategy?: string;
  orderId?: string;
  market?: "crypto" | "stocks";
};

type CacheShape = {
  updatedAt: string;
  symbols: Record<string, TrailingSymbolState>;
};

let memory: CacheShape | null = null;

function emptyCache(): CacheShape {
  return { updatedAt: new Date().toISOString(), symbols: {} };
}

function readDisk(): CacheShape {
  try {
    const file = cacheFile();
    if (!fs.existsSync(file)) return emptyCache();
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as CacheShape;
    if (!raw || typeof raw !== "object" || !raw.symbols) return emptyCache();
    return raw;
  } catch {
    return emptyCache();
  }
}

function writeDisk(cache: CacheShape): void {
  try {
    fs.mkdirSync(cacheDir(), { recursive: true });
    fs.writeFileSync(cacheFile(), JSON.stringify(cache, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[TrailingRegistry] write failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

function load(): CacheShape {
  if (memory) return memory;
  memory = readDisk();
  return memory;
}

function persist(): void {
  const cache = load();
  cache.updatedAt = new Date().toISOString();
  writeDisk(cache);
}

function norm(symbol: string): string {
  return symbol.trim().toUpperCase().replace("/", "");
}

/** Kraken EUR pairs / Alpaca crypto / IBKR crypto bases — not US stock tickers. */
export function isCryptoTrailingSymbol(symbol: string): boolean {
  const s = norm(symbol);
  if (!s) return false;
  if (isLegacyOrphanTicker(s)) return false;
  if (s.endsWith("EUR") || s.endsWith("USDT") || s.endsWith("USD")) {
    // Exclude obvious FX pairs that aren't crypto (rare in this file)
    if (/^(EUR|USD|USDT)$/.test(s)) return false;
    return true;
  }
  // Bare crypto bases used historically
  if (
    /^(BTC|XBT|ETH|SOL|XRP|ADA|DOT|LINK|AVAX|ATOM|LTC|BCH|BNB|DOGE|MATIC|UNI|AAVE|ZRO)$/.test(
      s,
    )
  ) {
    return true;
  }
  return false;
}

export function getTrailingState(symbol: string): TrailingSymbolState | null {
  const row = load().symbols[norm(symbol)];
  return row ?? null;
}

export function upsertTrailingState(
  symbol: string,
  patch: Partial<TrailingSymbolState> & { peak?: number },
): TrailingSymbolState {
  const key = norm(symbol);
  const cache = load();
  const prev = cache.symbols[key];
  const next: TrailingSymbolState = {
    peak: patch.peak ?? prev?.peak ?? 0,
    trailingActive: patch.trailingActive ?? prev?.trailingActive ?? false,
    partialSold: patch.partialSold ?? prev?.partialSold ?? false,
    cooldownUntil:
      patch.cooldownUntil !== undefined ? patch.cooldownUntil : prev?.cooldownUntil,
    updatedAt: new Date().toISOString(),
    entryPrice:
      patch.entryPrice !== undefined ? patch.entryPrice : prev?.entryPrice,
    stopLoss: patch.stopLoss !== undefined ? patch.stopLoss : prev?.stopLoss,
    takeProfit:
      patch.takeProfit !== undefined ? patch.takeProfit : prev?.takeProfit,
    qty: patch.qty !== undefined ? patch.qty : prev?.qty,
    openedAt: patch.openedAt !== undefined ? patch.openedAt : prev?.openedAt,
    strategy: patch.strategy !== undefined ? patch.strategy : prev?.strategy,
    orderId: patch.orderId !== undefined ? patch.orderId : prev?.orderId,
    market: patch.market !== undefined ? patch.market : prev?.market,
  };
  cache.symbols[key] = next;
  persist();
  return next;
}

/** True when symbol has an active exit-manager registration (entry + SL or TP). */
export function isExitRegistered(symbol: string): boolean {
  const row = getTrailingState(symbol);
  if (!row) return false;
  if (!(row.entryPrice != null && row.entryPrice > 0)) return false;
  const hasSl = row.stopLoss != null && row.stopLoss > 0;
  const hasTp = row.takeProfit != null && row.takeProfit > 0;
  return hasSl || hasTp;
}

/**
 * Register a live crypto fill into the exit manager (same step as fill).
 * Writes stop / target / trailing seed into crypto-trailing.json.
 */
export function registerCryptoExitPosition(params: {
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  qty: number;
  openedAt?: string;
  strategy?: string;
  orderId?: string;
}): TrailingSymbolState {
  const entry = params.entryPrice > 0 ? params.entryPrice : 0;
  const sl =
    params.stopLoss > 0 ? params.stopLoss : entry > 0 ? entry * (1 - EXIT_STOP_LOSS_PCT) : 0;
  const tp =
    params.takeProfit > 0
      ? params.takeProfit
      : entry > 0
        ? entry * (1 + EXIT_TRAIL_ACTIVATE_PCT)
        : 0;
  const state = upsertTrailingState(params.symbol, {
    peak: Math.max(0, entry),
    trailingActive: false,
    partialSold: false,
    cooldownUntil: undefined,
    entryPrice: entry,
    stopLoss: sl,
    takeProfit: tp,
    qty: params.qty > 0 ? params.qty : 0,
    openedAt: params.openedAt ?? new Date().toISOString(),
    strategy: params.strategy,
    orderId: params.orderId,
    market: "crypto",
  });
  console.log(
    `[ExitRegistry] ${norm(params.symbol)} registered entry=${entry} ` +
      `SL=${sl} TP=${tp} qty=${params.qty} strategy=${params.strategy ?? "n/a"}`,
  );
  return state;
}

/** Record a full close and start 6h rebuy cooldown; clear peak/trail flags. */
export function recordFullClose(symbol: string): void {
  const until = new Date(Date.now() + EXIT_REBUY_COOLDOWN_MS).toISOString();
  upsertTrailingState(symbol, {
    peak: 0,
    trailingActive: false,
    partialSold: false,
    cooldownUntil: until,
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    qty: 0,
  });
}

export function clearTrailingForOpen(symbol: string, entryOrPrice: number): TrailingSymbolState {
  return upsertTrailingState(symbol, {
    peak: Math.max(0, entryOrPrice),
    trailingActive: false,
    partialSold: false,
    cooldownUntil: undefined,
  });
}

export function isRebuyCooldownActive(symbol: string, nowMs: number = Date.now()): boolean {
  const row = getTrailingState(symbol);
  if (!row?.cooldownUntil) return false;
  const until = Date.parse(row.cooldownUntil);
  if (!Number.isFinite(until)) return false;
  return nowMs < until;
}

export function countTrailingActive(): number {
  return Object.values(load().symbols).filter((s) => s.trailingActive).length;
}

export function listTrailingActiveSymbols(): string[] {
  return Object.entries(load().symbols)
    .filter(([, s]) => s.trailingActive)
    .map(([sym]) => sym);
}

export function listRegisteredCryptoSymbols(): string[] {
  return Object.keys(load().symbols).filter(
    (sym) => isCryptoTrailingSymbol(sym) && isExitRegistered(sym),
  );
}

/**
 * Remove legacy orphans (HYDC, …) and non-crypto stock tickers from crypto-trailing.json.
 * Returns purged symbol keys.
 */
export function purgeNonCryptoFromTrailingRegistry(): string[] {
  const cache = load();
  const purged: string[] = [];
  for (const key of Object.keys(cache.symbols)) {
    if (isLegacyOrphanTicker(key) || !isCryptoTrailingSymbol(key)) {
      delete cache.symbols[key];
      purged.push(key);
    }
  }
  if (purged.length) {
    persist();
    console.log(
      `[TrailingRegistry] purged non-crypto/orphan: ${purged.sort().join(",")}`,
    );
  }
  return purged;
}

/**
 * Evaluate absolute stop / target from registry (no broker).
 * Used by ExitManager + E2E tests.
 */
export function evaluateRegisteredStopOrTarget(params: {
  symbol: string;
  price: number;
}): "STOP_LOSS" | "TAKE_PROFIT" | null {
  const state = getTrailingState(params.symbol);
  if (!state || !(params.price > 0)) return null;
  if (state.stopLoss != null && state.stopLoss > 0 && params.price <= state.stopLoss) {
    return "STOP_LOSS";
  }
  if (
    state.takeProfit != null &&
    state.takeProfit > 0 &&
    params.price >= state.takeProfit
  ) {
    return "TAKE_PROFIT";
  }
  return null;
}

/** Test helper — wipe memory (disk untouched unless caller deletes file). */
export function __resetTrailingRegistryMemoryForTests(): void {
  memory = null;
}
