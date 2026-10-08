/**
 * Fixed Kraken userref for all ForgeOS orders (int32).
 * Used to reclaim orphan positions from TradesHistory / ClosedOrders.
 */

/** Stable ForgeOS marker — never change without migrating journals. */
export const FORGEOS_KRAKEN_USERREF = 2_709_2701;

export function forgeosKrakenUserref(): number {
  const raw = Number(process.env.KRAKEN_FORGEOS_USERREF ?? FORGEOS_KRAKEN_USERREF);
  if (Number.isFinite(raw) && raw > 0 && raw <= 2_147_483_647) return Math.floor(raw);
  return FORGEOS_KRAKEN_USERREF;
}
