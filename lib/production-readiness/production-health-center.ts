/** Program 6500 — Production Health Center main aggregator */

import type { VentureProject } from "@/lib/domain/venture";
import { getVentures } from "@/lib/store/ventures";
import { VANDL_VENTURE } from "@/lib/fixtures/vandl-venture";
import type { HealthStatus, ProductionConfigSummary, ProductionHealthCenterSnapshot } from "./types";
import { PRODUCTION_READINESS_VERSION } from "./types";
import {
  getProductionEnvironment,
  getProductionHealthEndpoint,
  isKillSwitchEnabled,
  isProductionDryRun,
  isProductionMonitoringEnabled,
} from "./config";
import { buildSystemHealthSnapshot, probeExternalHealthEndpoint } from "./system-monitoring";
import { buildRuntimeMonitoringSnapshot } from "./runtime-monitoring";
import { buildAiMonitoringSnapshot } from "./ai-monitoring";
import { getActiveAlerts, seedDemoAlerts } from "./alert-center";
import { listIncidents, seedDemoIncidents } from "./incident-manager";
import { runAggregatedHealthChecks, computeOverallHealthFromChecks } from "./health-checks";
import { buildProductionChecklist } from "./production-checklist";
import { evaluateDeploymentGates } from "./deployment-gates";
import { getKillSwitchState } from "./kill-switch";
import { listProductionFeatureFlags } from "./feature-flags";
import { listReleases } from "./release-manager";
import { collectPerformanceMetrics } from "./performance-dashboard";
import { listErrorLogs, seedDemoErrors } from "./error-tracking";
import { listRecoveryProcedures } from "./recovery-center";
import { getBackupStatus } from "./backup-manager";
import { listDisasterRecoveryPlans } from "./disaster-recovery";
import { incrementCounter } from "./metrics";

function resolveVentures(): VentureProject[] {
  const stored = getVentures();
  return stored.length > 0 ? stored : [VANDL_VENTURE];
}

function buildConfigSummary(): ProductionConfigSummary {
  return {
    monitoringEnabled: isProductionMonitoringEnabled(),
    killSwitchEnabled: isKillSwitchEnabled(),
    healthEndpoint: getProductionHealthEndpoint(),
    dryRun: isProductionDryRun(),
    environment: getProductionEnvironment(),
  };
}

export async function buildProductionHealthCenterSnapshot(): Promise<ProductionHealthCenterSnapshot> {
  const ventures = resolveVentures();

  if (typeof window !== "undefined") {
    seedDemoAlerts();
    seedDemoIncidents();
    seedDemoErrors();
  }

  const system = buildSystemHealthSnapshot();
  const endpoint = getProductionHealthEndpoint();
  if (endpoint) {
    const external = await probeExternalHealthEndpoint(endpoint);
    if (external) system.checks.push(external);
  }

  const healthChecks = await runAggregatedHealthChecks(ventures);
  const overallStatus: HealthStatus = computeOverallHealthFromChecks(healthChecks);

  incrementCounter("health_checks");

  return {
    version: PRODUCTION_READINESS_VERSION,
    generatedAt: new Date().toISOString(),
    overallStatus,
    config: buildConfigSummary(),
    system,
    runtime: buildRuntimeMonitoringSnapshot(ventures),
    ai: await buildAiMonitoringSnapshot(),
    alerts: getActiveAlerts(),
    incidents: listIncidents(),
    healthChecks,
    checklist: buildProductionChecklist(),
    deploymentGates: evaluateDeploymentGates(),
    killSwitch: getKillSwitchState(),
    featureFlags: listProductionFeatureFlags(),
    releases: listReleases(),
    performance: collectPerformanceMetrics(),
    errors: listErrorLogs(),
    recovery: listRecoveryProcedures(),
    backups: getBackupStatus(),
    disasterRecovery: listDisasterRecoveryPlans(),
  };
}

export async function runProductionReadinessEngine(): Promise<ProductionHealthCenterSnapshot> {
  return buildProductionHealthCenterSnapshot();
}
