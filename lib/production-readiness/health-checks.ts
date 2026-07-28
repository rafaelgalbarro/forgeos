/** Program 6500 — Aggregated health checks */

import type { HealthCheckResult, HealthStatus } from "./types";
import { buildSystemHealthSnapshot } from "./system-monitoring";
import { buildRuntimeMonitoringSnapshot } from "./runtime-monitoring";
import { buildAiMonitoringSnapshot } from "./ai-monitoring";
import { validateEnvironment } from "./environment-validation";
import { validateSecrets } from "./secrets-validation";
import { validateConfiguration } from "./configuration-validator";
import { getKillSwitchState } from "./kill-switch";

function mapStatus(s: HealthStatus): HealthStatus {
  return s;
}

export async function runAggregatedHealthChecks(
  ventures?: Parameters<typeof buildRuntimeMonitoringSnapshot>[0]
): Promise<HealthCheckResult[]> {
  const start = Date.now();
  const results: HealthCheckResult[] = [];

  const system = buildSystemHealthSnapshot();
  for (const check of system.checks) {
    results.push({
      id: `system:${check.id}`,
      label: check.label,
      category: "system",
      status: mapStatus(check.status),
      message: check.message,
    });
  }

  const runtime = buildRuntimeMonitoringSnapshot(ventures);
  results.push({
    id: "runtime:overall",
    label: "Runtime portfolio",
    category: "runtime",
    status: runtime.status,
    message: `Score ${runtime.score}% — ${runtime.portfolioHealthy}/${runtime.portfolioTotal} ventures`,
  });

  const ai = await buildAiMonitoringSnapshot();
  results.push({
    id: "ai:overall",
    label: "AI Control Center",
    category: "ai",
    status: ai.status,
    message: `${ai.providersHealthy}/${ai.providersTotal} proveedores — Real AI: ${ai.realAiActive ? "activo" : "simulación"}`,
  });

  const env = validateEnvironment();
  results.push({
    id: "env:validation",
    label: "Validación de entorno",
    category: "config",
    status: env.valid ? "healthy" : env.errors.length > 0 ? "critical" : "degraded",
    message: env.valid ? "OK" : env.errors[0],
  });

  const secrets = validateSecrets();
  const missingRequired = secrets.filter((s) => s.required && !s.present);
  results.push({
    id: "secrets:validation",
    label: "Secretos requeridos",
    category: "security",
    status: missingRequired.length > 0 ? "critical" : "healthy",
    message: `${secrets.filter((s) => s.present).length}/${secrets.length} presentes`,
  });

  const config = validateConfiguration();
  results.push({
    id: "config:schema",
    label: "Esquema de configuración",
    category: "config",
    status: config.valid ? "healthy" : "degraded",
    message: config.valid ? "OK" : `${config.issues.length} avisos`,
  });

  const killSwitch = getKillSwitchState();
  results.push({
    id: "kill-switch",
    label: "Kill Switch",
    category: "security",
    status: killSwitch.enabled ? "critical" : "healthy",
    message: killSwitch.enabled ? "ACTIVO — sistemas bloqueados" : "Desactivado (default)",
  });

  const durationMs = Date.now() - start;
  for (const r of results) {
    if (!r.durationMs) r.durationMs = durationMs;
  }

  return results;
}

export function computeOverallHealthFromChecks(checks: HealthCheckResult[]): HealthStatus {
  const order: HealthStatus[] = ["offline", "critical", "degraded", "unknown", "healthy"];
  return checks.reduce<HealthStatus>((worst, c) => {
    return order.indexOf(c.status) < order.indexOf(worst) ? c.status : worst;
  }, "healthy");
}
