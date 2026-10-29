/**
 * Map Kraken spot EUR pairs → PF_* USD perpetuals (multi-collateral flex).
 */

import "server-only";

import { krakenPairBase, type KrakenEurPair } from "@/lib/brokers/kraken/pairs";

/** Spot altname → PF symbol (USD quote). */
const SPOT_TO_PF: Record<string, string> = {
  XBTEUR: "PF_XBTUSD",
  XXBTZEUR: "PF_XBTUSD",
  ETHEUR: "PF_ETHUSD",
  XETHZEUR: "PF_ETHUSD",
  SOLEUR: "PF_SOLUSD",
  ADAEUR: "PF_ADAUSD",
  LINKEUR: "PF_LINKUSD",
  DOTEUR: "PF_DOTUSD",
  LTCEUR: "PF_LTCUSD",
  AVAXEUR: "PF_AVAXUSD",
  ATOMEUR: "PF_ATOMUSD",
  XDGEUR: "PF_DOGEUSD",
  DOGEUR: "PF_DOGEUSD",
};

export function spotPairToPfSymbol(spotPair: string): string | null {
  const key = spotPair.trim().toUpperCase().replace("/", "");
  if (SPOT_TO_PF[key]) return SPOT_TO_PF[key]!;
  const base = krakenPairBase(key);
  const mapped = SPOT_TO_PF[`${base}EUR`] ?? SPOT_TO_PF[`${base}ZEUR`];
  if (mapped) return mapped;
  const pf = `PF_${base}USD`;
  return pf;
}

export function pfSymbolToSpotPair(pf: string): KrakenEurPair | null {
  const sym = pf.trim().toUpperCase();
  if (!sym.startsWith("PF_") || !sym.endsWith("USD")) return null;
  const base = sym.slice(3, -3);
  const map: Record<string, KrakenEurPair> = {
    XBT: "XBTEUR",
    BTC: "XBTEUR",
    ETH: "ETHEUR",
    SOL: "SOLEUR",
    ADA: "ADAEUR",
    LINK: "LINKEUR",
    DOT: "DOTEUR",
    LTC: "LTCEUR",
    AVAX: "AVAXEUR",
    ATOM: "ATOMEUR",
    DOGE: "XDGEUR",
  };
  return map[base] ?? null;
}

export type FuturesInstrumentMeta = {
  symbol: string;
  tickSize: number;
  contractSize: number;
  contractValueTradePrecision: number;
  tradeable: boolean;
  base: string;
  quote: string;
  minSize: number;
};

export function instrumentMinContracts(meta: FuturesInstrumentMeta): number {
  const step = 10 ** -meta.contractValueTradePrecision;
  return Math.max(step, meta.minSize);
}

/** Notional (USD) for `size` contracts at `price`. */
export function futuresNotionalUsd(
  size: number,
  price: number,
  meta: FuturesInstrumentMeta,
): number {
  return Math.abs(size) * price * meta.contractSize;
}

export function quantizeFuturesSize(
  raw: number,
  meta: FuturesInstrumentMeta,
): number {
  const step = 10 ** -meta.contractValueTradePrecision;
  if (!(raw > 0) || !(step > 0)) return 0;
  const q = Math.floor(raw / step) * step;
  const min = instrumentMinContracts(meta);
  if (q < min) return 0;
  return Number(q.toFixed(Math.max(0, Math.min(10, meta.contractValueTradePrecision))));
}

export function quantizeFuturesPrice(price: number, tickSize: number): number {
  if (!(price > 0) || !(tickSize > 0)) return price;
  // Fix float artefacts (1.8235000000000001 → Kraken "invalidPrice").
  const decimals = Math.max(0, Math.min(10, Math.ceil(-Math.log10(tickSize) - 1e-9)));
  return Number((Math.round(price / tickSize) * tickSize).toFixed(decimals));
}
