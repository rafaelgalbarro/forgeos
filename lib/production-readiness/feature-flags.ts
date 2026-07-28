/** Program 6500 — Production feature flags (read-only extend beta/commercial) */

import { listFeatureFlags } from "@/lib/beta-platform/feature-flags";
import { listCommercialFeatures } from "@/lib/commercial/feature-flags";
import { isBetaMode } from "@/lib/beta-platform/config";
import { isCommercialMode } from "@/lib/commercial/config";
import { isKillSwitchEnabled, isProductionMonitoringEnabled } from "./config";
import type { ProductionFeatureFlag } from "./types";

export function listProductionFeatureFlags(): ProductionFeatureFlag[] {
  const flags: ProductionFeatureFlag[] = [
    {
      id: "production-monitoring",
      name: "Monitoreo de producción",
      description: "Centro de salud y alertas 24/7",
      enabled: isProductionMonitoringEnabled(),
      source: "env",
      readOnly: true,
    },
    {
      id: "kill-switch",
      name: "Kill Switch de emergencia",
      description: "Corte de emergencia env-gated (default off)",
      enabled: isKillSwitchEnabled(),
      source: "env",
      readOnly: true,
    },
    {
      id: "beta-mode",
      name: "Beta Mode",
      description: "Plataforma beta activa",
      enabled: isBetaMode(),
      source: "beta",
      readOnly: true,
    },
    {
      id: "commercial-mode",
      name: "Commercial Mode",
      description: "Capa comercial activa",
      enabled: isCommercialMode(),
      source: "commercial",
      readOnly: true,
    },
  ];

  for (const bf of listFeatureFlags()) {
    flags.push({
      id: `beta:${bf.id}`,
      name: bf.name,
      description: bf.description,
      enabled: bf.enabled,
      source: "beta",
      readOnly: true,
    });
  }

  for (const cf of listCommercialFeatures()) {
    flags.push({
      id: `commercial:${cf.id}`,
      name: cf.name,
      description: cf.description,
      enabled: cf.enabled,
      source: "commercial",
      readOnly: true,
    });
  }

  return flags;
}

export function isProductionFeatureEnabled(id: string): boolean {
  return listProductionFeatureFlags().find((f) => f.id === id)?.enabled ?? false;
}
