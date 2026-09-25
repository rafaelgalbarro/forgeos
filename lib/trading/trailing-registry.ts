/**
 * Shared peak / trailing / cooldown registry for ExitManager (crypto + stocks).
 * Persist: .forgeos/cache/crypto-trailing.json
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "crypto-trailing.json");

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
    if (!fs.existsSync(CACHE_FILE)) return emptyCache();
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheShape;
    if (!raw || typeof raw !== "object" || !raw.symbols) return emptyCache();
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
  };
  cache.symbols[key] = next;
  persist();
  return next;
}

/** Record a full close and start 6h rebuy cooldown; clear peak/trail flags. */
export function recordFullClose(symbol: string): void {
  const until = new Date(Date.now() + EXIT_REBUY_COOLDOWN_MS).toISOString();
  upsertTrailingState(symbol, {
    peak: 0,
    trailingActive: false,
    partialSold: false,
    cooldownUntil: until,
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
