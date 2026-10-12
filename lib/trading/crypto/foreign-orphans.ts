/**
 * Kraken balances marked foreign/orphan by reconcile (no ForgeOS journal/userref).
 * Never count toward CRYPTO_LIVE_MAX_POSITIONS and never auto-manage.
 */

import "server-only";

const foreignOrphans = new Set<string>();

function norm(pair: string): string {
  return pair.trim().toUpperCase().replace("/", "");
}

export function markForeignOrphanPair(pair: string): void {
  const p = norm(pair);
  if (p) foreignOrphans.add(p);
}

export function markForeignOrphanPairs(pairs: readonly string[]): void {
  for (const p of pairs) markForeignOrphanPair(p);
}

export function isForeignOrphanPair(pair: string): boolean {
  const p = norm(pair);
  if (!p) return false;
  if (foreignOrphans.has(p)) return true;
  const base = p.replace(/EUR$/, "");
  for (const o of foreignOrphans) {
    if (o === p || o.replace(/EUR$/, "") === base) return true;
  }
  return false;
}

export function getForeignOrphanPairs(): ReadonlySet<string> {
  return foreignOrphans;
}

/** Test helper. */
export function clearForeignOrphanPairs(): void {
  foreignOrphans.clear();
}
