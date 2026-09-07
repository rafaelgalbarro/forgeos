import "server-only";

function parseEnvBool(raw: string | undefined, fallback = false): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

/**
 * Read FOREX_ENABLED at request time (never inlined for client bundles).
 * Checks process.env on each API / RSC call.
 */
export function readForexEnabledAtRuntime(): boolean {
  return parseEnvBool(process.env.FOREX_ENABLED ?? process.env.ALLOW_FOREX, false);
}

/** Lightweight status for FOREX UI + polls. */
export function readForexRuntimeStatus() {
  const forexEnabled = readForexEnabledAtRuntime();
  return {
    forexEnabled,
    envForexEnabled: process.env.FOREX_ENABLED ?? null,
    envAllowForex: process.env.ALLOW_FOREX ?? null,
    readAt: new Date().toISOString(),
  };
}
