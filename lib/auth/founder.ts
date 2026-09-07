/**
 * Private single-user Founder gate.
 * FOUNDER_USERNAME (server) / NEXT_PUBLIC_FOUNDER_USERNAME (client) — default rafa2200.
 */

export type AuthRole = "FOUNDER" | "USER";

export const SESSION_INACTIVITY_MS = 24 * 60 * 60 * 1000;

export function getFounderUsername(): string {
  const fromPublic = process.env.NEXT_PUBLIC_FOUNDER_USERNAME?.trim();
  const fromServer = process.env.FOUNDER_USERNAME?.trim();
  return (fromPublic || fromServer || "rafa2200").toLowerCase();
}

/** Normalize login identity (email or username) for founder checks. */
export function normalizeAuthIdentity(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * True when identity is the configured Founder (username, bare email local-part, or exact email).
 */
export function isFounderIdentity(emailOrUsername: string): boolean {
  const founder = getFounderUsername();
  const id = normalizeAuthIdentity(emailOrUsername);
  if (!id) return false;
  if (id === founder) return true;
  if (id.startsWith(`${founder}@`)) return true;
  const local = id.split("@")[0] ?? "";
  return local === founder;
}

export function founderPrivatePlatformMessage(): string {
  return "Plataforma privada";
}
