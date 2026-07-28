/** Program 6500 — Runtime monitoring (read-only via public APIs) */

import { buildPortfolioHealthSnapshot } from "@/lib/health";
import {
  EXECUTION_ENGINE_DEPENDENCY_NOTE,
  isExecutionEngineModuleAvailable,
} from "@/lib/runtime/observability";
import type { HealthStatus, RuntimeMonitoringSnapshot } from "./types";

function scoreToStatus(score: number): HealthStatus {
  if (score >= 80) return "healthy";
  if (score >= 50) return "degraded";
  return "critical";
}

export function buildRuntimeMonitoringSnapshot(
  ventures?: Parameters<typeof buildPortfolioHealthSnapshot>[0]
): RuntimeMonitoringSnapshot {
  const executionEngineAvailable = isExecutionEngineModuleAvailable();
  let portfolioHealthy = 0;
  let portfolioTotal = 0;
  let score = executionEngineAvailable ? 75 : 50;

  if (ventures && ventures.length > 0) {
    const health = buildPortfolioHealthSnapshot(ventures);
    portfolioHealthy = health.healthy + health.operating + health.scaling;
    portfolioTotal = ventures.length;
    score = Math.round((portfolioHealthy / portfolioTotal) * 100);
  }

  return {
    status: scoreToStatus(score),
    score,
    executionEngineAvailable,
    dependencyNote: executionEngineAvailable ? undefined : EXECUTION_ENGINE_DEPENDENCY_NOTE,
    portfolioHealthy,
    portfolioTotal,
    timestamp: new Date().toISOString(),
  };
}
