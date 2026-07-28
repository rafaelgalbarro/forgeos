/** Program 6500 — Deployment gates before deploy */

import type { DeploymentGate, DeploymentGateStatus } from "./types";
import { buildProductionChecklist, checklistScore } from "./production-checklist";
import { validateEnvironment } from "./environment-validation";
import { isKillSwitchEnabled, isProductionDryRun } from "./config";
import { getPendingMigrations } from "./migration-manager";
import { getBuildPipelinePolicy } from "@/lib/build-pipeline";

function gate(status: DeploymentGateStatus, blocking: boolean): Pick<DeploymentGate, "status" | "blocking"> {
  return { status, blocking };
}

export function evaluateDeploymentGates(): DeploymentGate[] {
  const checklist = buildProductionChecklist();
  const score = checklistScore(checklist);
  const env = validateEnvironment();
  const pipeline = getBuildPipelinePolicy();

  return [
    {
      id: "checklist",
      label: "Checklist de producción",
      ...gate(score >= 70 ? "pass" : score >= 50 ? "warn" : "fail", score < 50),
      message: `Score ${score}%`,
    },
    {
      id: "env",
      label: "Entorno válido",
      ...gate(env.valid ? "pass" : "fail", !env.valid),
      message: env.errors[0] ?? "OK",
    },
    {
      id: "kill-switch",
      label: "Kill switch inactivo",
      ...gate(isKillSwitchEnabled() ? "fail" : "pass", isKillSwitchEnabled()),
      message: isKillSwitchEnabled() ? "Bloqueado" : "OK",
    },
    {
      id: "migrations",
      label: "Migraciones aplicadas",
      ...gate(getPendingMigrations().length === 0 ? "pass" : "warn", false),
      message: `${getPendingMigrations().length} pendientes`,
    },
    {
      id: "dry-run",
      label: "Política de build pipeline",
      ...gate("pass", false),
      message: pipeline.requireApproval ? "Aprobación requerida" : "Auto",
    },
    {
      id: "approval",
      label: "Aprobación de despliegue",
      ...gate(isProductionDryRun() ? "pending" : "warn", false),
      message: isProductionDryRun() ? "Dry-run — sin deploy real" : "Revisar aprobación manual",
    },
  ];
}

export function canDeploy(): boolean {
  return evaluateDeploymentGates().every((g) => !g.blocking || g.status === "pass" || g.status === "warn");
}
