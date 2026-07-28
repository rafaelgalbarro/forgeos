/** ForgeOS Real Build Flow — validator (RC5.2). */

import type { BuildFlowEnvironment, BuildFlowInput } from "./types";

const BLOCKED_PATTERNS = [
  "delete",
  "destroy",
  "drop",
  "production",
  "apply_dns",
  "push_main",
  "merge_main",
];

export interface BuildFlowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBuildFlowInput(input: BuildFlowInput): BuildFlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.ventureId?.trim()) errors.push("ventureId is required");
  if (!input.requestedBy?.trim()) errors.push("requestedBy is required");

  const env = input.environment ?? getDefaultEnvironment();
  if (env === "preview" && process.env.FORGEOS_CONNECTIONS_PRODUCTION === "true") {
    warnings.push("FORGEOS_CONNECTIONS_PRODUCTION is true — preview mode still enforced");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function isOperationBlocked(operation: string, payload?: Record<string, unknown>): boolean {
  const haystack = `${operation} ${JSON.stringify(payload ?? {})}`.toLowerCase();
  return BLOCKED_PATTERNS.some((p) => haystack.includes(p));
}

export function getDefaultEnvironment(): BuildFlowEnvironment {
  const env = process.env.REAL_BUILD_DEFAULT_ENVIRONMENT ?? "preview";
  if (env === "sandbox") return "sandbox";
  if (env === "dry_run") return "dry_run";
  return "preview";
}

export function isRealBuildFlowEnabled(): boolean {
  return process.env.ENABLE_REAL_BUILD_FLOW === "true";
}

export function isBuildFlowApprovalRequired(): boolean {
  return process.env.REAL_BUILD_REQUIRE_APPROVAL !== "false";
}
