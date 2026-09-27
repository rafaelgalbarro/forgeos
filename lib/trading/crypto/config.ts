/**
 * Crypto broker routing + live IBKR safety caps.
 * CRYPTO_BROKER=alpaca (default) | ibkr
 */

import "server-only";

export type CryptoBrokerId = "alpaca" | "ibkr";

/** Default IBKR crypto account (PAXOS) until permissions are approved. */
export const CRYPTO_IBKR_ACCOUNT_DEFAULT = "U24225949";

export function getCryptoBroker(): CryptoBrokerId {
  const v = (process.env.CRYPTO_BROKER ?? "alpaca").trim().toLowerCase();
  return v === "ibkr" ? "ibkr" : "alpaca";
}

/** True when crypto cycle must use IBKR CRYPTO/PAXOS (not Alpaca paper). */
export function isIbkrCryptoBroker(): boolean {
  if (getCryptoBroker() === "ibkr") return true;
  const legacy = (process.env.IBKR_CRYPTO_ENABLED ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(legacy);
}

export function cryptoIbkrAccountId(): string {
  return (
    process.env.CRYPTO_IBKR_ACCOUNT_ID?.trim() ||
    process.env.IBKR_CRYPTO_ACCOUNT_ID?.trim() ||
    CRYPTO_IBKR_ACCOUNT_DEFAULT
  );
}

/** Max notional per new IBKR crypto BUY when live. Default $25. */
export function cryptoLiveMaxNotionalUsd(): number {
  const n = Number(process.env.CRYPTO_LIVE_MAX_NOTIONAL_USD ?? 25);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

/**
 * Max open crypto positions.
 * IBKR live default 3; Alpaca paper keeps 5.
 */
export function cryptoLiveMaxPositions(): number {
  if (isIbkrCryptoBroker()) {
    const n = Number(process.env.CRYPTO_LIVE_MAX_POSITIONS ?? 3);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
  }
  const n = Number(process.env.CRYPTO_LIVE_MAX_POSITIONS ?? 5);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

/** Aggressive IBKR crypto sell limit = mid × (1 − pct). Default 0.5%. */
export function cryptoSellAggressiveDiscountPct(): number {
  const n = Number(process.env.CRYPTO_SELL_AGGRESSIVE_DISCOUNT_PCT ?? 0.005);
  return Number.isFinite(n) && n > 0 && n < 0.05 ? n : 0.005;
}
