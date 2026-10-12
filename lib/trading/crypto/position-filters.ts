/**
 * Countable Kraken positions for CRYPTO_LIVE_MAX_POSITIONS.
 * Shadow journal opens never count. Dust and foreign/orphan balances never count.
 */

import "server-only";

import { peekKrakenPairMeta } from "@/lib/brokers/kraken/asset-pairs";
import { journalOpenCryptoPairs } from "@/lib/trading/crypto/journal-crypto";
import {
  getForeignOrphanPairs,
  isForeignOrphanPair,
} from "@/lib/trading/crypto/foreign-orphans";

/** Minimum notional (EUR) to treat a balance as a real position. */
export const MIN_POSITION_NOTIONAL_EUR = 1;

export type BalanceLike = {
  symbol: string;
  qty: number;
  marketValueEur: number;
  base?: string;
};

function norm(symbol: string): string {
  return symbol.trim().toUpperCase().replace("/", "");
}

function baseOf(symbol: string): string {
  const s = norm(symbol);
  return s.replace(/EUR$/, "").replace(/^XBT$/, "BTC");
}

/** True when qty is below pair ordermin OR notional is below €1. */
export function isDustKrakenBalance(
  qty: number,
  marketValueEur: number,
  orderMin = 0,
): boolean {
  if (!(qty > 0)) return true;
  if (Number.isFinite(marketValueEur) && marketValueEur < MIN_POSITION_NOTIONAL_EUR) {
    return true;
  }
  if (orderMin > 0 && qty < orderMin) return true;
  return false;
}

export function orderMinForPair(pair: string): number {
  const meta = peekKrakenPairMeta(pair);
  return meta?.orderMin && meta.orderMin > 0 ? meta.orderMin : 0;
}

/** Meaningful (non-dust) balance rows. */
export function filterMeaningfulKrakenBalances<T extends BalanceLike>(
  rows: readonly T[],
): T[] {
  return rows.filter((r) => {
    if (isForeignOrphanPair(r.symbol)) return false;
    const orderMin = orderMinForPair(r.symbol);
    return !isDustKrakenBalance(r.qty, r.marketValueEur, orderMin);
  });
}

/**
 * Live ForgeOS open pairs confirmed by a meaningful Kraken balance.
 * Shadow journal opens are never included (journalOpenCryptoPairs is live-only).
 */
export function confirmedLiveOpenPairs(
  balances: readonly BalanceLike[],
  liveJournalPairs: ReadonlySet<string> = journalOpenCryptoPairs(),
): Set<string> {
  const meaningful = filterMeaningfulKrakenBalances(balances);
  const byBase = new Map<string, BalanceLike>();
  for (const b of meaningful) {
    byBase.set(baseOf(b.symbol), b);
    byBase.set(norm(b.symbol), b);
  }

  const out = new Set<string>();
  for (const raw of liveJournalPairs) {
    const pair = norm(raw);
    if (isForeignOrphanPair(pair)) continue;
    const hit =
      byBase.get(pair) ??
      byBase.get(baseOf(pair)) ??
      meaningful.find(
        (b) =>
          norm(b.symbol) === pair ||
          baseOf(b.symbol) === baseOf(pair) ||
          (b.base != null && baseOf(b.base) === baseOf(pair)),
      );
    if (!hit) continue;
    out.add(pair);
  }
  return out;
}

/** Count used by slot reservation / account snapshot (never shadows, never dust). */
export function countConfirmedLivePositions(
  balances: readonly BalanceLike[],
  liveJournalPairs?: ReadonlySet<string>,
): number {
  return confirmedLiveOpenPairs(balances, liveJournalPairs).size;
}

export function foreignOrphanSnapshot(): string[] {
  return [...getForeignOrphanPairs()];
}
