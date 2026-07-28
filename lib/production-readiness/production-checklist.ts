/** Program 6500 — Auto production checklist */

import type { ChecklistItem, ChecklistItemStatus } from "./types";
import { validateEnvironment } from "./environment-validation";
import { validateSecrets } from "./secrets-validation";
import { validateConfiguration } from "./configuration-validator";
import { isKillSwitchEnabled, isProductionMonitoringEnabled, isProductionDryRun } from "./config";
import { getPendingMigrations } from "./migration-manager";
import { getBackupStatus } from "./backup-manager";
import { getDisasterRecoveryPlan } from "./disaster-recovery";

function status(ok: boolean, warn = false): ChecklistItemStatus {
  if (ok) return "pass";
  return warn ? "warn" : "fail";
}

export function buildProductionChecklist(): ChecklistItem[] {
  const env = validateEnvironment();
  const secrets = validateSecrets();
  const config = validateConfiguration();
  const backups = getBackupStatus();
  const dr = getDisasterRecoveryPlan();

  return [
    {
      id: "monitoring",
      label: "Monitoreo de producción habilitado",
      category: "observability",
      status: status(isProductionMonitoringEnabled()),
      detail: isProductionMonitoringEnabled() ? "Activo" : "Deshabilitado",
    },
    {
      id: "dry-run",
      label: "Modo dry-run para operaciones destructivas",
      category: "safety",
      status: status(isProductionDryRun(), !isProductionDryRun()),
      detail: isProductionDryRun() ? "Seguro por defecto" : "Ejecución real habilitada",
    },
    {
      id: "kill-switch",
      label: "Kill switch desactivado",
      category: "safety",
      status: status(!isKillSwitchEnabled()),
      detail: isKillSwitchEnabled() ? "ACTIVO" : "Off (default)",
    },
    {
      id: "env-valid",
      label: "Validación de entorno",
      category: "config",
      status: status(env.valid, env.warnings.length > 0),
      detail: env.errors[0] ?? (env.warnings[0] ?? "OK"),
    },
    {
      id: "secrets",
      label: "Secretos opcionales documentados",
      category: "security",
      status: status(secrets.some((s) => s.present) || true, true),
      detail: `${secrets.filter((s) => s.present).length}/${secrets.length} configurados`,
    },
    {
      id: "config-schema",
      label: "Esquema de configuración",
      category: "config",
      status: status(config.valid),
      detail: config.valid ? "OK" : `${config.issues.length} problemas`,
    },
    {
      id: "migrations",
      label: "Migraciones pendientes",
      category: "database",
      status: status(getPendingMigrations().length === 0),
      detail: `${getPendingMigrations().length} pendientes`,
    },
    {
      id: "backups",
      label: "Backups recientes",
      category: "recovery",
      status: status(backups.some((b) => b.lastBackupAt), true),
      detail: `${backups.filter((b) => b.status === "healthy").length}/${backups.length} saludables`,
    },
    {
      id: "dr-plan",
      label: "Plan de disaster recovery",
      category: "recovery",
      status: status(dr.status !== "draft", dr.status === "draft"),
      detail: `Estado: ${dr.status}`,
    },
  ];
}

export function checklistScore(items: ChecklistItem[]): number {
  const scored = items.filter((i) => i.status !== "skip");
  if (scored.length === 0) return 0;
  const pass = scored.filter((i) => i.status === "pass").length;
  const warn = scored.filter((i) => i.status === "warn").length;
  return Math.round(((pass + warn * 0.5) / scored.length) * 100);
}
