/** Program 9000 — Intelligence Network configuration (env-driven). */

import { INTELLIGENCE_NETWORK_VERSION } from "./types";

export const INTELLIGENCE_NETWORK_STORAGE_KEYS = {
  consent: "forgeos-intelligence-network-consent",
  workspace: "forgeos-intelligence-network-workspace",
} as const;

export function isIntelligenceNetworkEnabled(): boolean {
  return envBool("ENABLE_INTELLIGENCE_NETWORK", false);
}

export function isNetworkConsentRequired(): boolean {
  return envBool("NETWORK_CONSENT_REQUIRED", true);
}

export function isAnonymizedBenchmarksEnabled(): boolean {
  return envBool("ENABLE_ANONYMIZED_BENCHMARKS", true);
}

export function getIntelligenceNetworkVersion(): string {
  return INTELLIGENCE_NETWORK_VERSION;
}

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}
