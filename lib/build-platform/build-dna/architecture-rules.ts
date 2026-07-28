/** Default architecture rules for generated software (Epic 6.1). */

import type { ArchitectureRules } from "./types";

export const DEFAULT_ARCHITECTURE_RULES: ArchitectureRules = {
  architecture: "Modular monolith with domain-driven boundaries",
  ddd: true,
  cleanArchitecture: true,
  hexagonal: true,
  featureFlags: {
    enabled: true,
    provider: "environment variables + runtime config",
  },
  performanceBudget: {
    maxBundleKb: 250,
    maxLcpMs: 2500,
    maxApiLatencyMs: 500,
  },
};
