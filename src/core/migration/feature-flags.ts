/**
 * PROGRAM 6070 — V2 migration feature flags.
 * All flags default OFF / gradual. Legacy remains authoritative when all are false.
 * Prefer reading via this module — do not scatter process.env checks.
 */

export const V2_FLAG_KEYS = [
  "ENABLE_V2_DOMAIN",
  "ENABLE_V2_COMMANDS",
  "ENABLE_V2_QUERIES",
  "ENABLE_V2_ORCHESTRATION",
  "ENABLE_V2_EVENTS",
  "ENABLE_V2_STUDIO",
  "ENABLE_V2_COMPANY_OS",
] as const;

export type V2FlagKey = (typeof V2_FLAG_KEYS)[number];

export type V2FeatureFlags = Record<V2FlagKey, boolean>;

/** Documented defaults — must match .env.example. */
export const V2_FLAG_DEFAULTS: V2FeatureFlags = {
  ENABLE_V2_DOMAIN: false,
  ENABLE_V2_COMMANDS: false,
  ENABLE_V2_QUERIES: false,
  ENABLE_V2_ORCHESTRATION: false,
  ENABLE_V2_EVENTS: false,
  ENABLE_V2_STUDIO: false,
  ENABLE_V2_COMPANY_OS: false,
};

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return fallback;
}

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[key];
}

/** Snapshot of current V2 flags from environment (server / Node). */
export function readV2FeatureFlags(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): V2FeatureFlags {
  const out = { ...V2_FLAG_DEFAULTS };
  for (const key of V2_FLAG_KEYS) {
    out[key] = parseBool(env[key] ?? readEnv(key), V2_FLAG_DEFAULTS[key]);
  }
  return out;
}

export function isV2FlagEnabled(key: V2FlagKey, env?: Record<string, string | undefined>): boolean {
  return readV2FeatureFlags(env)[key];
}

/** True when every V2 flag is off — legacy-only mode. */
export function isLegacyOnlyMode(env?: Record<string, string | undefined>): boolean {
  const flags = readV2FeatureFlags(env);
  return V2_FLAG_KEYS.every((k) => flags[k] === false);
}

/** Matrices used by PROGRAM 6070 verification docs. */
export const FLAG_MATRICES = {
  allOff: { ...V2_FLAG_DEFAULTS },
  domainOnly: { ...V2_FLAG_DEFAULTS, ENABLE_V2_DOMAIN: true },
  queriesOnly: { ...V2_FLAG_DEFAULTS, ENABLE_V2_QUERIES: true },
  commandsAndQueries: {
    ...V2_FLAG_DEFAULTS,
    ENABLE_V2_COMMANDS: true,
    ENABLE_V2_QUERIES: true,
  },
  orchestration: {
    ...V2_FLAG_DEFAULTS,
    ENABLE_V2_DOMAIN: true,
    ENABLE_V2_COMMANDS: true,
    ENABLE_V2_QUERIES: true,
    ENABLE_V2_ORCHESTRATION: true,
  },
  fullV2Candidate: {
    ENABLE_V2_DOMAIN: true,
    ENABLE_V2_COMMANDS: true,
    ENABLE_V2_QUERIES: true,
    ENABLE_V2_ORCHESTRATION: true,
    ENABLE_V2_EVENTS: true,
    ENABLE_V2_STUDIO: true,
    ENABLE_V2_COMPANY_OS: true,
  },
} as const;

export function describeFlagMatrix(name: keyof typeof FLAG_MATRICES): string {
  const m = FLAG_MATRICES[name];
  return Object.entries(m)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}
