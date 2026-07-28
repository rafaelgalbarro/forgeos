/** Program 6500 — Config schema checks */

import { isBetaMode } from "@/lib/beta-platform/config";
import { isCommercialMode } from "@/lib/commercial/config";
import type { ConfigValidationResult } from "./types";

export function validateConfiguration(): ConfigValidationResult {
  const issues: ConfigValidationResult["issues"] = [];

  if (isCommercialMode() && isBetaMode()) {
    issues.push({
      path: "modes",
      message: "Commercial y Beta mode activos simultáneamente — verificar intención",
      severity: "warning",
    });
  }

  if (typeof process !== "undefined") {
    const persistence = process.env.PERSISTENCE_PROVIDER ?? "local";
    if (persistence === "postgres" && !process.env.DATABASE_URL) {
      issues.push({
        path: "DATABASE_URL",
        message: "PERSISTENCE_PROVIDER=postgres requiere DATABASE_URL",
        severity: "error",
      });
    }

    const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "local";
    if (authProvider === "supabase" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      issues.push({
        path: "NEXT_PUBLIC_SUPABASE_URL",
        message: "Auth supabase requiere NEXT_PUBLIC_SUPABASE_URL",
        severity: "error",
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    valid: !hasErrors,
    schema: "forgeos-production-v1",
    issues,
  };
}
