import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hour

type ResetPayload = {
  email: string;
  exp: number;
};

function secret(): string {
  const value =
    process.env.AUTH_RESET_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    "";
  if (!value) {
    throw new Error("Falta AUTH_RESET_SECRET (o RESEND_API_KEY) para firmar tokens de reset");
  }
  return value;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

export function createPasswordResetToken(email: string, now = Date.now()): string {
  const payload: ResetPayload = {
    email: email.trim().toLowerCase(),
    exp: now + TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifyPasswordResetToken(
  token: string,
  now = Date.now(),
): { ok: true; email: string } | { ok: false; error: string } {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return { ok: false, error: "Token inválido" };
    const expected = createHmac("sha256", secret()).update(body).digest();
    const given = fromB64url(sig);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return { ok: false, error: "Token inválido" };
    }
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as ResetPayload;
    if (!payload.email || typeof payload.exp !== "number") {
      return { ok: false, error: "Token inválido" };
    }
    if (payload.exp < now) return { ok: false, error: "Token expirado (válido 1 hora)" };
    return { ok: true, email: payload.email.toLowerCase() };
  } catch {
    return { ok: false, error: "Token inválido" };
  }
}

export function passwordResetTtlMinutes(): number {
  return TTL_MS / 60_000;
}
