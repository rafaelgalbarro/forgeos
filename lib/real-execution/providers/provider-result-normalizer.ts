/** ForgeOS RC5.3 — normalize provider results (redact secrets). */

import { redactObject } from "@/lib/connections/security/secret-redaction";
import type { ConnectionProvider } from "@/lib/connections/shared/types";

export interface NormalizedProviderResult {
  provider: ConnectionProvider;
  success: boolean;
  executed: boolean;
  mode: "dry_run" | "sandbox" | "real";
  output: string;
  data?: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  rollbackSteps: string[];
  auditSummary: string;
}

export function normalizeProviderResult(params: {
  provider: ConnectionProvider;
  success: boolean;
  executed: boolean;
  mode: "dry_run" | "sandbox" | "real";
  output: string;
  data?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
  rollbackSteps?: string[];
}): NormalizedProviderResult {
  const redacted = params.data ? (redactObject(params.data) as Record<string, unknown>) : undefined;
  return {
    provider: params.provider,
    success: params.success,
    executed: params.executed,
    mode: params.mode,
    output: params.output,
    data: redacted,
    warnings: params.warnings ?? [],
    errors: params.errors ?? [],
    rollbackSteps: params.rollbackSteps ?? [],
    auditSummary: `[${params.provider}] ${params.executed ? "EXECUTED" : "PLANNED"}: ${params.output}`,
  };
}
