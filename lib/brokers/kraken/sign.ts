/**
 * Kraken Spot REST — HMAC-SHA512 signing + monotonic nonce.
 * Secrets never logged.
 */

import "server-only";

import crypto from "node:crypto";

let lastNonce = 0;

/** Always-increasing nonce (ms). */
export function nextKrakenNonce(): string {
  const now = Date.now();
  lastNonce = Math.max(now, lastNonce + 1);
  return String(lastNonce);
}

export function isKrakenConfigured(): boolean {
  return Boolean(
    process.env.KRAKEN_API_KEY?.trim() && process.env.KRAKEN_API_SECRET?.trim(),
  );
}

function apiKey(): string {
  return process.env.KRAKEN_API_KEY?.trim() ?? "";
}

function apiSecret(): string {
  return process.env.KRAKEN_API_SECRET?.trim() ?? "";
}

/**
 * API-Sign = base64(HMAC-SHA512(path + SHA256(nonce + postData), base64decode(secret)))
 */
export function signKrakenRequest(path: string, postData: string, nonce: string): string {
  const secret = apiSecret();
  if (!secret) throw new Error("KRAKEN_API_SECRET missing");
  const hash = crypto.createHash("sha256").update(nonce + postData, "utf8").digest();
  const hmac = crypto.createHmac("sha512", Buffer.from(secret, "base64"));
  hmac.update(path, "utf8");
  hmac.update(hash);
  return hmac.digest("base64");
}

export function krakenAuthHeaders(path: string, postData: string, nonce: string): Record<string, string> {
  const key = apiKey();
  if (!key) throw new Error("KRAKEN_API_KEY missing");
  return {
    "API-Key": key,
    "API-Sign": signKrakenRequest(path, postData, nonce),
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

/** Redact secrets from any accidental log string. */
export function redactKrakenSecrets(text: string): string {
  let out = text;
  const key = apiKey();
  const secret = apiSecret();
  if (key) out = out.split(key).join("[REDACTED_KEY]");
  if (secret) out = out.split(secret).join("[REDACTED_SECRET]");
  return out;
}
