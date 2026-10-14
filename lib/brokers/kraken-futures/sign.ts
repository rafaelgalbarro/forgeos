/**
 * Kraken Futures REST v3 — HMAC-SHA512 signing.
 * Critical: sign path is `/api/v3/...` WITHOUT the `/derivatives` URL prefix.
 */

import "server-only";

import crypto from "node:crypto";

let lastNonce = 0;

export function nextKrakenFuturesNonce(): string {
  const now = Date.now();
  lastNonce = Math.max(now, lastNonce + 1);
  return String(lastNonce);
}

/** Demo endpoint only when flagged or when prod keys are absent. */
export function useKrakenFuturesDemoEndpoint(): boolean {
  const flag = (process.env.KRAKEN_FUTURES_USE_DEMO ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(flag)) return true;
  if (process.env.KRAKEN_FUTURES_API_KEY?.trim()) return false;
  return Boolean(process.env.KRAKEN_FUTURES_DEMO_API_KEY?.trim());
}

export function isKrakenFuturesDemoMode(): boolean {
  return useKrakenFuturesDemoEndpoint();
}

export function krakenFuturesApiKey(): string {
  if (useKrakenFuturesDemoEndpoint()) {
    return process.env.KRAKEN_FUTURES_DEMO_API_KEY?.trim() ?? "";
  }
  return process.env.KRAKEN_FUTURES_API_KEY?.trim() ?? "";
}

export function krakenFuturesApiSecret(): string {
  if (useKrakenFuturesDemoEndpoint()) {
    return process.env.KRAKEN_FUTURES_DEMO_API_SECRET?.trim() ?? "";
  }
  return process.env.KRAKEN_FUTURES_API_SECRET?.trim() ?? "";
}

export function krakenFuturesRestBase(): string {
  if (useKrakenFuturesDemoEndpoint()) {
    return "https://demo-futures.kraken.com/derivatives";
  }
  return "https://futures.kraken.com/derivatives";
}

export function isKrakenFuturesConfigured(): boolean {
  return Boolean(krakenFuturesApiKey() && krakenFuturesApiSecret());
}

/**
 * Authent = base64(HMAC-SHA512(secret, SHA256(postData + nonce + endpointPath)))
 * endpointPath e.g. `/api/v3/accounts` (no `/derivatives` URL prefix)
 */
export function signKrakenFuturesRequest(
  endpointPath: string,
  postData: string,
  nonce: string,
  secretOverride?: string,
): string {
  const secret = secretOverride ?? krakenFuturesApiSecret();
  if (!secret) throw new Error("KRAKEN_FUTURES API secret missing");
  const message = `${postData}${nonce}${endpointPath}`;
  const hash = crypto.createHash("sha256").update(message, "utf8").digest();
  const hmac = crypto.createHmac("sha512", Buffer.from(secret, "base64"));
  hmac.update(hash);
  return hmac.digest("base64");
}

export function krakenFuturesAuthHeaders(
  endpointPath: string,
  postData: string,
  nonce: string,
): Record<string, string> {
  const key = krakenFuturesApiKey();
  if (!key) throw new Error("KRAKEN_FUTURES API key missing");
  return {
    APIKey: key,
    Authent: signKrakenFuturesRequest(endpointPath, postData, nonce),
    Nonce: nonce,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

export function redactKrakenFuturesSecrets(text: string): string {
  let out = text;
  for (const key of [
    process.env.KRAKEN_FUTURES_API_KEY,
    process.env.KRAKEN_FUTURES_DEMO_API_KEY,
  ]) {
    if (key?.trim()) out = out.split(key.trim()).join("[REDACTED_KEY]");
  }
  for (const secret of [
    process.env.KRAKEN_FUTURES_API_SECRET,
    process.env.KRAKEN_FUTURES_DEMO_API_SECRET,
  ]) {
    if (secret?.trim()) out = out.split(secret.trim()).join("[REDACTED_SECRET]");
  }
  return out;
}
