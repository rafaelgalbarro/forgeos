/** ForgeOS AI Runtime RC6 — feature flags & configuration. */

import type { AiActivationMode } from "@/lib/ai-control/types";

function envBool(key: string, defaultValue: boolean): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultValue;
}

/** Raw ENABLE_REAL_AI flag (default false). */
export function isRealAiFlagEnabled(): boolean {
  return envBool("ENABLE_REAL_AI", false);
}

/** Design partner gate — either flag enables partner mode. */
export function isDesignPartnerMode(): boolean {
  return envBool("ENABLE_DESIGN_PARTNER_AI", false) || envBool("DESIGN_PARTNER_MODE", false);
}

/** At least one Sprint 4 provider key configured. */
export function hasExplicitProviderKeys(): boolean {
  return Boolean(
    env("OPENAI_API_KEY") ||
      env("ANTHROPIC_API_KEY") ||
      env("GEMINI_API_KEY") ||
      env("GOOGLE_AI_API_KEY") ||
      env("OPENROUTER_API_KEY")
  );
}

/**
 * Real AI only when ENABLE_REAL_AI=true AND (design partner OR explicit keys).
 * When false (default), existing mock/simulation paths are used unchanged.
 */
export function isRealAiEnabled(): boolean {
  if (!isRealAiFlagEnabled()) return false;
  return isDesignPartnerMode() || hasExplicitProviderKeys();
}

export function getRealAiActivationStatus(): {
  flagEnabled: boolean;
  designPartner: boolean;
  hasProviderKeys: boolean;
  active: boolean;
  mode: AiActivationMode;
  blockReason?: string;
} {
  const flagEnabled = isRealAiFlagEnabled();
  const designPartner = isDesignPartnerMode();
  const hasProviderKeys = hasExplicitProviderKeys();
  const active = flagEnabled && (designPartner || hasProviderKeys);

  let blockReason: string | undefined;
  if (!flagEnabled) {
    blockReason = "ENABLE_REAL_AI=false";
  } else if (!designPartner && !hasProviderKeys) {
    blockReason = "Requiere ENABLE_DESIGN_PARTNER_AI o API keys de proveedor";
  }

  return {
    flagEnabled,
    designPartner,
    hasProviderKeys,
    active,
    mode: active ? "real" : "mock",
    blockReason,
  };
}

export function isStreamingEnabled(): boolean {
  return envBool("ENABLE_STREAMING", true);
}

export function isMultiProviderRoutingEnabled(): boolean {
  return envBool("ENABLE_MULTI_PROVIDER_ROUTING", true);
}

export function isCostOptimizerEnabled(): boolean {
  return envBool("ENABLE_COST_OPTIMIZER", true);
}

export function getMonthlyBudgetUsd(): number {
  const raw = process.env.AI_MONTHLY_BUDGET_USD?.trim();
  const n = raw ? Number(raw) : 100;
  return Number.isFinite(n) && n > 0 ? n : 100;
}

export function env(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}
