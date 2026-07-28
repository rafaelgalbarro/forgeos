/** PROGRAM 5370 — Network policy — localhost only. */

export const SANDBOX_BIND_HOST = "127.0.0.1";
export const SANDBOX_PORT_MIN = 3100;
export const SANDBOX_PORT_MAX = 3999;

export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

export function buildPreviewUrl(port: number): string {
  return `http://${SANDBOX_BIND_HOST}:${port}`;
}

export function validatePreviewUrl(url: string): void {
  if (!isLocalhostUrl(url)) {
    throw new Error(`Preview URL must be localhost only: ${url}`);
  }
}

export const BLOCKED_ENV_PATTERNS = [
  /^VERCEL_/i,
  /^AWS_/i,
  /^SUPABASE_SERVICE_ROLE/i,
  /^DATABASE_URL$/i,
  /^OPENAI_API_KEY$/i,
  /^ANTHROPIC_API_KEY$/i,
];

export function isEnvVarAllowed(key: string): boolean {
  return !BLOCKED_ENV_PATTERNS.some((p) => p.test(key));
}
