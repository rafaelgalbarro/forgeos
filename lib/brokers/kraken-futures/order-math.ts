/**
 * Pure helpers for Kraken Futures order construction (no server-only → unit-testable).
 *
 * Strategy signals are computed on Kraken *spot EUR* bars, while orders go to
 * PF_* *USD* perpetuals. Prices (stop / TP) must be translated into the
 * contract's USD price space before sending, otherwise a short's stop lands
 * below the mark (EUR price ≈ USD price / 1.12) and Kraken rejects it.
 */

import type { FuturesInstrumentMeta } from "./instruments";

/** Kraken /sendorder `sendStatus.status` values that mean the order is live. */
const ACCEPTED_SEND_STATUSES = new Set(["placed", "partiallyfilled", "filled", "edited"]);

export function isAcceptedSendStatus(status: unknown): boolean {
  if (status == null || status === "") return true; // older payloads omit status
  return ACCEPTED_SEND_STATUSES.has(String(status).toLowerCase());
}

/** Translate a spot-EUR signal price into the PF USD price space using the live ratio. */
export function signalPriceToContract(
  signalPrice: number,
  signalEntry: number,
  contractPx: number,
): number {
  if (!(signalPrice > 0) || !(signalEntry > 0) || !(contractPx > 0)) return signalPrice;
  return signalPrice * (contractPx / signalEntry);
}

/** Round a stop to tick in the direction that keeps the loss smaller. */
export function quantizeStopConservative(
  stop: number,
  tickSize: number,
  positionSide: "long" | "short",
): number {
  if (!(stop > 0) || !(tickSize > 0)) return stop;
  const steps = stop / tickSize;
  const q = positionSide === "long" ? Math.ceil(steps - 1e-9) : Math.floor(steps + 1e-9);
  const decimals = Math.max(0, Math.ceil(-Math.log10(tickSize)));
  return Number((q * tickSize).toFixed(decimals));
}

export type FuturesSizingResult =
  | { ok: true; symbol: string; size: number; price: number; notionalUsd: number }
  | { ok: false; reason: string; minNotionalEur?: number };

/** Contract size for a USD notional; explicit reason when it cannot be sized. */
export function sizeForNotionalUsd(args: {
  symbol: string;
  meta: FuturesInstrumentMeta | null;
  notionalUsd: number;
  price: number;
  eurUsd: number;
}): FuturesSizingResult {
  const { meta, price } = args;
  if (!meta) return { ok: false, reason: "instrument_unknown" };
  if (!meta.tradeable) return { ok: false, reason: "not_tradeable" };
  if (!(price > 0)) return { ok: false, reason: "no_price" };
  const step = 10 ** -meta.contractValueTradePrecision;
  const minContracts = Math.max(step, meta.minSize);
  const raw = args.notionalUsd / (price * meta.contractSize);
  const q = Math.floor(raw / step + 1e-9) * step;
  if (q < minContracts) {
    const minUsd = minContracts * price * meta.contractSize;
    const minEur = args.eurUsd > 0 ? minUsd / args.eurUsd : minUsd;
    return {
      ok: false,
      reason: `below_min_contract(min=${minContracts} ≈ ${minEur.toFixed(2)}€ > cap ${(args.notionalUsd / (args.eurUsd || 1)).toFixed(2)}€)`,
      minNotionalEur: minEur,
    };
  }
  const size = Number(q.toFixed(Math.max(0, Math.min(10, meta.contractValueTradePrecision))));
  return {
    ok: true,
    symbol: args.symbol,
    size,
    price,
    notionalUsd: size * price * meta.contractSize,
  };
}
