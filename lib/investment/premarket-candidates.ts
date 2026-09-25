/**
 * In-memory USA premarket candidates — high priority for 14:00–15:30 Madrid.
 * Tracks first-seen time so GAP AND GO can require a 5-minute hold.
 */

import "server-only";

export type PremarketCandidateRow = {
  symbol: string;
  gapPct: number;
  volume: number;
  price: number;
  source: string;
  firstSeenAtMs: number;
  priority: "HIGH" | "NORMAL";
};

type Store = {
  updatedAtMs: number;
  bySymbol: Map<string, PremarketCandidateRow>;
};

const store: Store = {
  updatedAtMs: 0,
  bySymbol: new Map(),
};

const GAP_HOLD_MS = 5 * 60_000;
/** Keep candidates through USA first hour. */
const STORE_TTL_MS = 90 * 60_000;

function prune(): void {
  const now = Date.now();
  if (store.updatedAtMs > 0 && now - store.updatedAtMs > STORE_TTL_MS) {
    store.bySymbol.clear();
    store.updatedAtMs = 0;
    return;
  }
  for (const [sym, row] of store.bySymbol) {
    if (now - row.firstSeenAtMs > STORE_TTL_MS) store.bySymbol.delete(sym);
  }
}

export function upsertPremarketCandidates(
  rows: readonly Omit<PremarketCandidateRow, "firstSeenAtMs" | "priority">[],
): PremarketCandidateRow[] {
  prune();
  const now = Date.now();
  store.updatedAtMs = now;
  for (const row of rows) {
    const symbol = row.symbol.trim().toUpperCase();
    if (!symbol) continue;
    const prev = store.bySymbol.get(symbol);
    store.bySymbol.set(symbol, {
      symbol,
      gapPct: row.gapPct,
      volume: row.volume,
      price: row.price,
      source: row.source,
      firstSeenAtMs: prev?.firstSeenAtMs ?? now,
      priority: "HIGH",
    });
  }
  return listPremarketCandidates();
}

export function listPremarketCandidates(): PremarketCandidateRow[] {
  prune();
  return [...store.bySymbol.values()].sort((a, b) => b.gapPct - a.gapPct);
}

export function isPremarketHighPriority(ticker: string): boolean {
  prune();
  return store.bySymbol.has(ticker.trim().toUpperCase());
}

/** True when gap candidate has been observed for ≥5 minutes (GAP AND GO gate). */
export function hasPremarketGapHeld(ticker: string, holdMs = GAP_HOLD_MS): boolean {
  prune();
  const row = store.bySymbol.get(ticker.trim().toUpperCase());
  if (!row) return false;
  return Date.now() - row.firstSeenAtMs >= holdMs;
}

export function getPremarketGapAgeMs(ticker: string): number {
  prune();
  const row = store.bySymbol.get(ticker.trim().toUpperCase());
  if (!row) return 0;
  return Math.max(0, Date.now() - row.firstSeenAtMs);
}

export function peekPremarketCandidate(ticker: string): PremarketCandidateRow | null {
  prune();
  return store.bySymbol.get(ticker.trim().toUpperCase()) ?? null;
}
