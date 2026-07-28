/** Program 6500 — Environment / config validation */

import { getProductionEnvironment, isProductionDryRun, isProductionMonitoringEnabled } from "./config";
import type { EnvironmentValidationResult } from "./types";

export function validateEnvironment(): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const env = getProductionEnvironment();

  if (env === "production" && isProductionDryRun()) {
    warnings.push("PRODUCTION_DRY_RUN activo en entorno production");
  }

  if (!isProductionMonitoringEnabled()) {
    warnings.push("ENABLE_PRODUCTION_MONITORING deshabilitado");
  }

  if (typeof process !== "undefined") {
    if (process.env.ENABLE_KILL_SWITCH === "true") {
      errors.push("KILL SWITCH activo — sistemas críticos bloqueados");
    }

    if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
      warnings.push("AUTH_SECRET no configurado en production");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}
