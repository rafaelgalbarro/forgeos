/**
 * Kraken EUR crypto pairs used by ForgeOS (CRYPTO_BROKER=kraken).
 */

import "server-only";

/** Trading pairs — EUR quote only. */
export const KRAKEN_EUR_PAIRS = [
  "XBTEUR",
  "ETHEUR",
  "SOLEUR",
  "XRPEUR",
  "ADAEUR",
  "LINKEUR",
  "DOTEUR",
  "LTCEUR",
] as const;

export type KrakenEurPair = (typeof KRAKEN_EUR_PAIRS)[number];

const PAIR_SET = new Set<string>(KRAKEN_EUR_PAIRS);

/** Map ForgeOS / display symbols → Kraken altname. */
const SYMBOL_TO_PAIR: Record<string, KrakenEurPair> = {
  BTC: "XBTEUR",
  XBT: "XBTEUR",
  XBTEUR: "XBTEUR",
  BTCUSD: "XBTEUR",
  BTCUSDT: "XBTEUR",
  ETH: "ETHEUR",
  ETHEUR: "ETHEUR",
  SOL: "SOLEUR",
  SOLEUR: "SOLEUR",
  XRP: "XRPEUR",
  XRPEUR: "XRPEUR",
  ADA: "ADAEUR",
  ADAEUR: "ADAEUR",
  LINK: "LINKEUR",
  LINKEUR: "LINKEUR",
  DOT: "DOTEUR",
  DOTEUR: "DOTEUR",
  LTC: "LTCEUR",
  LTCEUR: "LTCEUR",
};

/** Kraken balance asset codes → base for our pairs. */
const BALANCE_ASSET_TO_BASE: Record<string, string> = {
  XXBT: "XBT",
  XBT: "XBT",
  BTC: "XBT",
  XETH: "ETH",
  ETH: "ETH",
  SOL: "SOL",
  XXRP: "XRP",
  XRP: "XRP",
  ADA: "ADA",
  LINK: "LINK",
  DOT: "DOT",
  XLTC: "LTC",
  LTC: "LTC",
  ZEUR: "EUR",
  EUR: "EUR",
};

export function normalizeKrakenPair(input: string): KrakenEurPair | null {
  const key = input.trim().toUpperCase().replace("/", "");
  const mapped = SYMBOL_TO_PAIR[key];
  if (mapped) return mapped;
  if (PAIR_SET.has(key)) return key as KrakenEurPair;
  return null;
}

export function isKrakenEurPair(input: string): boolean {
  return normalizeKrakenPair(input) != null;
}

/** Base asset for a pair (XBT, ETH, …). */
export function krakenPairBase(pair: string): string {
  const p = normalizeKrakenPair(pair) ?? pair.toUpperCase();
  if (p.endsWith("EUR")) return p.slice(0, -3);
  return p;
}

/** Map Kraken Balance key → base or EUR. */
export function normalizeKrakenBalanceAsset(asset: string): string | null {
  const key = asset.trim().toUpperCase();
  return BALANCE_ASSET_TO_BASE[key] ?? (key.length <= 5 ? key : null);
}

export function pairFromBase(base: string): KrakenEurPair | null {
  const b = base.trim().toUpperCase();
  if (b === "XBT" || b === "BTC") return "XBTEUR";
  return normalizeKrakenPair(`${b}EUR`);
}
